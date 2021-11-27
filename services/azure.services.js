const multer = require('multer');
const getStream = require('into-stream');
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require('@azure/storage-blob');

const containerName = 'music';  //blob storage container name
const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 6 * ONE_MEGABYTE, maxBuffers: 20 };

const sharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);
const pipeline = newPipeline(sharedKeyCredential);

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
  pipeline
);

const service = {
  async save(blobName, buffer) {
    const stream = getStream(buffer);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    try {
      await blockBlobClient.uploadStream(stream,
        uploadOptions.bufferSize, uploadOptions.maxBuffers,
        { blobHTTPHeaders: { blobContentType: "image/jpeg" } });
      return { success: { message: 'File uploaded to Azure Blob Storage.' } };
    } catch (err) {
      return { error: { message: err.message } };
    }
  },
  async get () {
    let data = [];
    try {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const listBlobsResponse = await containerClient.listBlobFlatSegment();

      for await (const blob of listBlobsResponse.segment.blobItems) {
        console.log(`Blob: ${blob.name}`);
      }

      if (listBlobsResponse.segment.blobItems.length) {
        data = listBlobsResponse.segment.blobItems;
      }
      return data;
    } catch (err) {
      return {error: { message: 'There was an error contacting the blob storage container.' }}
    }
  }
}

module.exports = service;