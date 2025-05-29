const express=require('express')
const categoryController=require('../controllers/category.controllers')
const router=express.Router()


router.post("/addCategory", categoryController.addCategory);
router.delete('/deleteCategory/:categoryid',categoryController.deleteCategory)
router.put('/updateCategory/:categoryid', categoryController.updateCategory);
router.get('/getCategory', categoryController.getCategory);



module.exports=router;