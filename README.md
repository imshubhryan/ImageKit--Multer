# 📸 File Upload using Multer + ImageKit (MERN)

## 📖 Introduction

When a user uploads an image (Product, Profile Picture, Post, etc.), we don't store the actual image inside MongoDB.

Instead:

- Multer extracts the uploaded file from the request.
- ImageKit uploads that file to cloud storage.
- MongoDB stores only the image URL.

---

# Architecture

```
User
   │
   ▼
Express
   │
   ▼
Multer
   │
   ▼
RAM (Buffer)
   │
   ▼
ImageKit
   │
   ▼
Cloud Storage
   │
   ▼
MongoDB (Image URL)
```

---

# Part 1 : ImageKit Setup

ImageKit is responsible for storing images in the cloud.

## Step 1 Install

```bash
npm install @imagekit/nodejs
```

---

## Step 2 Create Account

Login to ImageKit Dashboard.

You'll get

```
Public Key

Private Key

URL Endpoint
```

---

## Step 3 Store Keys

```
IMAGEKIT_PUBLIC_KEY=

IMAGEKIT_PRIVATE_KEY=

IMAGEKIT_URL_ENDPOINT=
```

Never push Private Key to GitHub.

---

## Step 4 Create ImageKit Client

```js
import ImageKit from "@imagekit/nodejs";

const client = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint
});
```

### Explanation

This does **NOT upload any image**.

It simply creates a connection with your ImageKit account.

Just like

```js
mongoose.connect(...)
```

connects to MongoDB,

```js
new ImageKit(...)
```

connects to ImageKit.

---

# Step 5 Create Upload Service

```js
export const uploadFile = async ({
    buffer,
    fileName,
    folder = "snitch"
}) => {

    const result = await client.files.upload({

        file: await ImageKit.toFile(buffer),

        fileName,

        folder

    });

    return result;

}
```

---

## Line by Line Explanation

### buffer

```
Actual image bytes
```

This comes from Multer.

---

### fileName

Original file name.

Example

```
shirt.jpg
```

---

### folder

Folder inside ImageKit.

Default

```
snitch/
```

---

### ImageKit.toFile(buffer)

Converts Buffer into ImageKit File Object.

```
Buffer

↓

ImageKit File

↓

Upload
```

---

### client.files.upload()

Uploads image to ImageKit Cloud.

Returns

```js
{
   fileId,

   url,

   name,

   width,

   height
}
```

---

### return result

Returns ImageKit response back to Controller.

---

# Part 2 : Multer Setup

ImageKit can upload images.

But who provides the image?

Answer:

Multer.

---

## Install

```bash
npm install multer
```

---

## Import

```js
import multer from "multer";
```

---

## Create Multer

```js
const upload = multer({

    storage: multer.memoryStorage(),

    limits:{
        fileSize:5*1024*1024
    }

});
```

---

## memoryStorage()

Multer stores uploaded image inside RAM.

```
Request

↓

RAM

↓

Buffer
```

Image is **NOT stored on disk**.

---

## Buffer

Buffer is the actual binary data of the uploaded image.

```
Image

↓

Bytes

↓

Buffer
```

Node.js stores uploaded files as Buffers.

---

# Part 3 : Route

```js
router.post(

"/",

authenticateSeller,

upload.array("images",7),

createProduct

)
```

---

## upload.array()

Meaning

```
Accept

Maximum 7 images

from

images field.
```

After this middleware,

Multer automatically creates

```js
req.files
```

---

# req.files

Example

```js
[
   {

      originalname:"shirt1.jpg",

      buffer:<Buffer>

   },

   {

      originalname:"shirt2.jpg",

      buffer:<Buffer>

   }

]
```

This object is created by Multer.

---

# Part 4 : Controller

```js
const images = await Promise.all(

    req.files.map(async(file)=>{

        return await uploadFile({

            buffer:file.buffer,

            fileName:file.originalname

        })

    })

)
```

---

## Step 1

```
req.files
```

Comes from

```
Multer
```

---

## Step 2

```
map()
```

Loops through every uploaded image.

If user uploads

```
Image1

Image2

Image3
```

map executes uploadFile() three times.

---

## Step 3

```js
buffer:file.buffer
```

Actual image.

Provided by Multer.

---

## Step 4

```js
fileName:file.originalname
```

Original uploaded file name.

---

## Step 5

```
uploadFile()
```

Uploads every image to ImageKit.

Returns

```
Image URL
```

---

## Step 6

Promise.all()

Waits until every image upload is completed.

Returns

```js
images = [

   {...},

   {...},

   {...}

]
```

---

# Complete Workflow

```
User Uploads Image

↓

Express

↓

Multer

↓

memoryStorage()

↓

Buffer

↓

req.files

↓

Controller

↓

uploadFile()

↓

ImageKit

↓

Cloud Storage

↓

URL Returned

↓

MongoDB
```

---

# Responsibilities

## Multer

- Reads multipart/form-data
- Extracts uploaded files
- Stores files in RAM
- Creates req.file / req.files

---

## ImageKit

- Receives Buffer
- Uploads image to cloud
- Returns URL
- Returns fileId

---

## MongoDB

Stores only

```
Image URL
```

Not the actual image.

---

# Interview Questions

### Why Multer?

Because Express cannot parse multipart/form-data.

---

### Why memoryStorage()?

To temporarily store uploaded image inside RAM before uploading it to ImageKit.

---

### Why Buffer?

Because Node.js stores uploaded file data as binary bytes inside a Buffer.

---

### Why ImageKit?

To permanently store images in cloud storage.

---

### Why Promise.all()?

To upload multiple images simultaneously and wait until all uploads are completed.

---

### Why MongoDB stores URL instead of image?

Databases are optimized for structured data, while cloud storage is optimized for storing media files. Therefore, MongoDB stores only the image URL returned by ImageKit.

---

# One Line Summary

**Multer extracts uploaded files from the incoming request and stores them temporarily in RAM as Buffers. The controller passes those Buffers to ImageKit, which uploads the images to cloud storage and returns their URLs. Finally, MongoDB stores only those URLs.**
