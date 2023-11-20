# Azure Storage Sync

Azure Storage Sync is a Node.js package designed to synchronize files between a local file system and Azure Blob Storage. Works on linux and windows filesystems.

## Features

- Real-time synchronization from local file system to Azure Blob Storage.
- Supports multiple directories and corresponding Azure Blob containers to a single Azure Storage Account using an access key.
- Change detection based on last modified date.
- Easy configuration and setup.

## Installation

```bash
npm install @omarmciver/azurestoragesync
```

## Usage

To use Azure Storage Sync, create a configuration file (`config.json`) with your Azure Storage account details and the paths you want to synchronize.

### Example `config.json`

```json
{
  "azureStorage": {
    "accountName": "your_account_name",
    "accessKey": "your_access_key"
  },
  "watchPaths": [
    {
      "localPath": "path/to/linux/dir",
      "containerPath": "alias1"
    },
    {
      "localPath": "d:\\path\\to\\windows\\dir",
      "containerPath": "alias2"
    }
    // ... more paths as needed
  ]
}
```

### Starting the Sync

Run the synchronization script with the path to your `config.json`:

```bash
node sync.js path/to/config.json
```

## Contributing

Contributions are welcome! If you have a feature request or bug report, please open an issue on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
