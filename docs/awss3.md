# AWS S3 Upload

The project uses AWS S3 for uploading forum images.

Images are uploaded using pre-signed URLs.

The backend generates a temporary upload URL, then the frontend uploads the file directly to S3.

MongoDB stores only the S3 object key.

Example

```
forum-group/image.jpg

forum-discussions/image.png
```

Do NOT store:

- Base64 images
- Binary image data
- Full S3 URLs (unless existing code already requires them)

---

# Existing Upload Implementation

The existing upload implementation already exists.

Frontend reference:

```
frontend/src/pages/user/4_forums/CreateGroupModal.tsx
```

This component contains the standard upload flow used by the project.

When implementing uploads for new forum features (discussion images, comment attachments, etc.), reuse the same upload logic instead of creating a new implementation.

---

# Backend Upload API

Upload endpoints already exist.

Reference the existing implementation in:

Controllers

```
backend/controllers/fileControllers.js
```

Services

```
backend/services/fileServices.js
```

Repositories

```
backend/repositories/fileRepositories.js
```

Always reuse the existing upload endpoint.

Do not create duplicate upload APIs.

---

# Upload Flow

The upload flow is:

1. User selects a file.
2. Frontend requests a pre-signed upload URL.
3. Backend generates a pre-signed S3 URL.
4. Frontend uploads directly to S3 using HTTP PUT.
5. Backend returns the generated S3 object key.
6. Only the S3 object key is stored in MongoDB.

Example API

```
POST /api/files/upload-url
```

Request

```json
{
    "folder": "forum-group",
    "filename": "image.png",
    "contentType": "image/png"
}
```

Response

```json
{
    "success": true,
    "uploadUrl": "...",
    "key": "forum-group/image.png"
}
```

---

# Upload Rules

Always:

- Reuse the existing upload helper.
- Reuse the existing upload endpoint.
- Upload directly to S3 using the pre-signed URL.
- Store only the returned object key.
- Validate