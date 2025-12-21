const { BlobServiceClient } = require('@azure/storage-blob');

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'photos';

const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new require('@azure/storage-blob').StorageSharedKeyCredential(accountName, accountKey)
);

async function uploadPhoto(fileName, fileBuffer, mimeType) {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create container if it doesn't exist
    await containerClient.createIfNotExists({
      access: 'blob' // Public read access for blobs
    });

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType
      }
    });

    return blockBlobClient.url;
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
}

async function deletePhoto(fileName) {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    await blockBlobClient.deleteIfExists();
    return true;
  } catch (err) {
    console.error('Delete error:', err);
    throw err;
  }
}

async function getPhotoUrl(fileName) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  return blockBlobClient.url;
}

async function listPhotos() {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobs = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push({
        name: blob.name,
        url: `https://${accountName}.blob.core.windows.net/${containerName}/${blob.name}`,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified
      });
    }
    
    return blobs;
  } catch (err) {
    console.error('List error:', err);
    throw err;
  }
}

module.exports = {
  uploadPhoto,
  deletePhoto,
  getPhotoUrl,
  listPhotos
};
