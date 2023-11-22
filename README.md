# Azure Storage Sync

Azure Storage Sync is a Node.js package designed to synchronize files between a local file system and Azure Blob Storage. Works on linux and windows filesystems.

[View at npmjs.com](https://www.npmjs.com/package/@omarmciver/azurestoragesync)

## Features

- Real-time synchronization from local file system to Azure Blob Storage.
- Supports multiple directories and corresponding Azure Blob containers to a single Azure Storage Account using an access key.
- Change detection based on last modified date.
- Easy configuration and setup.

## Installation and Usage

Global installation and usage:
```bash
npm install -g @omarmciver/azurestoragesync
azurestoragesync
```

On demand usage:
```bash
npx @omarmciver/azurestoragesync
```

**NOTE:** It will always use the config.json in the current working directory.

## Configuration

To use Azure Storage Sync, create a configuration file (`config.json`) with your Azure Storage account details and the paths you want to synchronize.

The first time you run the script, it will create a `config.json` file in the current directory. Modify as required and then run the command again.


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




## Contributing

Contributions are welcome! If you have a feature request or bug report, please open an issue on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
