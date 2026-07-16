# 📸 File Upload in MERN — Multer + ImageKit

## Introduction

When a user uploads an image (product photo, profile picture, post image, etc.), we **don't** store the actual image inside MongoDB. Instead, the flow is:

1. **Multer** extracts the uploaded file from the incoming request.
2. **ImageKit** uploads that file to cloud storage.
3. **MongoDB** stores only the resulting image URL.

This keeps the database lightweight and delegates media storage to a service built for it.

## Architecture

```
User → Express → Multer → RAM (Buffer) → ImageKit → Cloud Storage
                                                          │
                                                          ▼
                                              MongoDB (stores only the URL)
```

---

## Part 1 — ImageKit Setup

ImageKit is the service responsible for storing images in the cloud.

### 1. Install

```bash
npm install @imagekit/nodejs
```

### 2. Create an account

Log in to the ImageKit dashboard and grab three credentials:

- Public Key
- Private Key
- URL Endpoint

### 3. Store credentials in `.env`

```env
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
```

> ⚠️ **Never** push the Private Key to GitHub — add `.env` to `.gitignore`.

### 4. Create the ImageKit client

```js
import ImageKit from "@imagekit/nodejs";

const client = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint,
});
```

This line does **not** upload anything — it just opens a connection to your ImageKit account, the same way `mongoose.connect()` opens a connection to MongoDB.

### 5. Create the upload service

```js
export const uploadFile = async ({ buffer, fileName, folder = "snitch" }) => {
  const result = await client.files.upload({
    file: await ImageKit.toFile(buffer),
    fileName,
    folder,
  });

  return result;
};
```

| Parameter | What it is |
|---|---|
| `buffer` | Raw image bytes, provided by Multer |
| `fileName` | Original file name (e.g. `shirt.jpg`) |
| `folder` | Destination folder in ImageKit (defaults to `snitch/`) |
| `ImageKit.toFile(buffer)` | Converts the raw Buffer into a format ImageKit's API accepts |
| `client.files.upload()` | Performs the actual upload and returns `{ fileId, url, name, width, height }` |

---

## Part 2 — Multer Setup

ImageKit can upload an image — but it needs someone to hand it that image first. That's Multer's job.

### Install

```bash
npm install multer
```

### Configure

```js
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
```

**`memoryStorage()`** — Multer holds the uploaded file in RAM as a `Buffer` instead of writing it to disk first. Since the file is going straight to ImageKit, there's no need for a temporary disk write.

---

## Part 3 — Route

```js
router.post("/", authenticateSeller, upload.array("images", 7), createProduct);
```

`upload.array("images", 7)` tells Multer: *accept up to 7 files from the `images` field.* After this middleware runs, Multer populates `req.files`:

```js
req.files = [
  { originalname: "shirt1.jpg", buffer: <Buffer> },
  { originalname: "shirt2.jpg", buffer: <Buffer> },
];
```

---

## Part 4 — Controller

```js
const images = await Promise.all(
  req.files.map(async (file) =>
    uploadFile({
      buffer: file.buffer,
      fileName: file.originalname,
    })
  )
);
```

**What's happening:**

1. `req.files` — the array Multer created.
2. `.map()` — loops through every uploaded file and calls `uploadFile()` for each one.
3. `Promise.all()` — runs all uploads **concurrently** and waits for every single one to finish before continuing, instead of uploading one-by-one sequentially.
4. `images` — ends up as an array of ImageKit responses (`url`, `fileId`, etc.), ready to save on the product document.

---

## Complete Workflow

```
User uploads image
        ↓
    Express
        ↓
     Multer  →  stores file in RAM as a Buffer
        ↓
    req.files
        ↓
   Controller  →  calls uploadFile() for each file
        ↓
    ImageKit   →  uploads Buffer to cloud storage
        ↓
   Cloud Storage
        ↓
  URL returned
        ↓
    MongoDB    →  stores only the URL
```

---

## Who's Responsible for What

| Layer | Responsibility |
|---|---|
| **Multer** | Parses `multipart/form-data`, extracts uploaded files, stores them in RAM, creates `req.file` / `req.files` |
| **ImageKit** | Receives the Buffer, uploads it to the cloud, returns `url` and `fileId` |
| **MongoDB** | Stores only the image URL — never the raw file |

---

## Interview Q&A

**Why Multer?**
Express can't parse `multipart/form-data` on its own — Multer is the middleware that handles that.

**Why `memoryStorage()`?**
To hold the uploaded image temporarily in RAM before forwarding it to ImageKit, avoiding an unnecessary disk write.

**Why does Node store the file as a Buffer?**
Uploaded file data arrives as raw binary — Node.js represents that binary data as a `Buffer`.

**Why ImageKit (or any cloud storage) instead of storing the file directly?**
Cloud storage is built for serving media efficiently (CDN, resizing, caching); a database is not.

**Why `Promise.all()`?**
To upload multiple images concurrently and wait for all of them to complete, rather than uploading one at a time.

**Why does MongoDB store only the URL, not the image?**
Databases are optimized for structured data; cloud storage is optimized for media files. So MongoDB just stores the reference (URL) that ImageKit returns.

---

## One-Line Summary

> Multer extracts uploaded files from the request and holds them in RAM as Buffers. The controller passes those Buffers to ImageKit, which uploads them to cloud storage and returns URLs. MongoDB stores only those URLs.
