import chokidar from 'chokidar';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { normalize, relative } from 'path';
import { BlobServiceClient, BlockBlobClient, StorageSharedKeyCredential } from '@azure/storage-blob';


interface AzureStorageConfig {
  accountName: string;
  accessKey: string;
}

interface WatchPath {
  localPath: string;
  containerPath: string;
}

interface Config {
  azureStorage: AzureStorageConfig;
  watchPaths: WatchPath[];
}

// Function to ensure config.json exists
function ensureConfigFile(targetFilePath: string, templateFilePath: string) {
  if (!fs.existsSync(targetFilePath)) {
    if (fs.existsSync(templateFilePath)) {
      fs.copyFileSync(templateFilePath, targetFilePath);
      console.log(`Created config.json at: ${targetFilePath}. You should edit this file before running the watcher again.`);
      process.exit();
    } else {
      throw new Error('Config template file not found. Cannot create config.json.');
    }
  }
}

// Get the config file path from the command line argument
const configFileArg = process.argv[2] || 'config.json';
const configFileFullPath = path.resolve(configFileArg);
// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configTemplatePath = path.resolve(__dirname, 'config.template.json');

// Ensure config file exists
ensureConfigFile(configFileFullPath, configTemplatePath);

// Read configuration from file
const config: Config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Setup watchers for each path
config.watchPaths.forEach(watchPath => {
  const watcher = chokidar.watch(watchPath.localPath, {
    persistent: true,
    usePolling: true, // Enable polling
    interval: 5000,
    binaryInterval: 10000,
  });
  console.log(`Watching ${watchPath.localPath}...`);

  // Event handlers
  watcher
    .on('add', async (path: string) => await syncToAzure(path, watchPath.containerPath))
    .on('change', async (path: string) => await syncToAzure(path, watchPath.containerPath))
    .on('unlink', async (path: string) => await deleteFromAzure(path, watchPath.containerPath));
});

// Function to read the local file state cache
function readFileStateCache(): Record<string, number> {
  try {
    return JSON.parse(fs.readFileSync('fileStates.json', 'utf8'));
  } catch (error) {
    return {};
  }
}

// Function to save the local file state cache
function saveFileStateCache(cache: Record<string, number>) {
  fs.writeFileSync('fileStates.json', JSON.stringify(cache, null, 2));
}

// Function to check if file needs sync
async function needsSync(blobClient: BlockBlobClient, localPath: string): Promise<boolean> {
  const fileStats = fs.statSync(localPath);
  const lastModifiedLocal = fileStats.mtimeMs;

  const fileStateCache = readFileStateCache();
  const lastSynced = fileStateCache[localPath] || 0;

  try {
    // Check if file exists in Azure and get its last modified time
    const blobProperties = await blobClient.getProperties();
    let lastModifiedAzure = 0;
    if (blobProperties.lastModified) {
      lastModifiedAzure = new Date(blobProperties.lastModified).getTime();
    }

    // Compare last modified times
    if (lastModifiedLocal > lastSynced && lastModifiedLocal > lastModifiedAzure) {
      fileStateCache[localPath] = lastModifiedLocal;
      saveFileStateCache(fileStateCache);
      return true;
    }
  } catch (error: any) {
    // If error is due to the blob not existing, return true to indicate it needs syncing
    if (error.statusCode === 404) {
      return true;
    }
    // Handle other errors as needed
    console.error('Error checking blob properties:', error);
  }

  return false;
}

// Function to create a BlobServiceClient
function createBlobServiceClient(config: AzureStorageConfig): BlobServiceClient {
  const sharedKeyCredential = new StorageSharedKeyCredential(config.accountName, config.accessKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${config.accountName}.blob.core.windows.net`,
    sharedKeyCredential
  );

  return blobServiceClient;
}


// Function to list all files in a directory recursively
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}


async function syncToAzure(localPath: string, containerPath: string): Promise<void> {
  // Normalize the local path
  localPath = normalize(localPath);

  // Find the base path
  const basePath = config.watchPaths.find(watchPath => localPath.startsWith(normalize(watchPath.localPath)))?.localPath;
  if (!basePath) {
    console.error('Base path not found for ' + localPath);
    return;
  }

  // Calculate the relative path from the base path and replace backslashes with forward slashes
  let blobName = relative(basePath, localPath).replace(/\\/g, '/');

  const blobServiceClient = createBlobServiceClient(config.azureStorage);
  const containerClient = blobServiceClient.getContainerClient(containerPath);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  if (await needsSync(blockBlobClient, localPath)) {
    console.log(`${localPath} has been added/changed. Uploading to Azure Blob Storage...${containerPath}/${blobName}`);
    const uploadBlobResponse = await blockBlobClient.uploadFile(localPath);
    console.log(`\tUpload complete: ${uploadBlobResponse.requestId}`);
  } else {
    console.log(`\t${localPath} is already up-to-date.`);
  }
}

async function deleteFromAzure(localPath: string, containerPath: string): Promise<void> {
  console.log(`Deleting ${localPath} from Azure Blob Storage...`);

  const blobServiceClient = createBlobServiceClient(config.azureStorage);
  const containerClient = blobServiceClient.getContainerClient(containerPath);

  // Calculate the blob name by removing the base path
  const basePath = config.watchPaths.find(watchPath => localPath.startsWith(watchPath.localPath))?.localPath;
  if (!basePath) {
    console.error('\tBase path not found for ' + localPath);
    return;
  }

  let blobName = localPath.substring(basePath.length);
  if (blobName.startsWith('/')) {
    blobName = blobName.substring(1); // Remove leading slash if present
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const deleteBlobResponse = await blockBlobClient.delete();
    console.log(`\tDelete complete: ${deleteBlobResponse.requestId}`);
  } catch (error: any) {
    console.error('\tError deleting blob:', error);
  }
}
