import { Router } from "express";

import multer from 'multer'


const upload = multer({
    storage:multer.memoryStorage(),
    limits:{
        fileSize: 5 * 1024 * 1024 //5mb
    }
})


const router = Router()

router.post('/', authenticateSeller,createProductValidator, upload.array('images', 7) ,createProduct )

export default router;
