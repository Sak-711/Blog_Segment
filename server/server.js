import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from "cors";
import aws from "aws-sdk";



//schema below
import User from './Schema/User.js';


const server = express();
let PORT=3000;

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password


server.use(express.json());
server.use(cors());


mongoose.connect(process.env.DB_LOCATION , {
    autoIndex: true
    })


//setting up S3 bucket

//NOTE: I have not connected the server to the AWS because i would have to make an account (which would require me to give bank details for some reason) and also i figured that my account is probably not going to be used anyways i can get away with not doing that.
//TODO: make a S3 bucket in AWS server and connect the aws to the server, to do that, you will have to generate some information from the s3 bucket that you create, i have provided the structure of the code for it, so you just have to put in the values.
//      the tutorial to this will be in this link <https://youtu.be/pGFy_uGtpCA?list=PLqm86YkewF6QbR7QwqYWcAbl70Zhv0JUE&t=1864>. 

const s3 = new aws.S3({
	region: 'ap-south-1',
	accessKeyId: process.env.AWS_ACCESS_KEY, 
	secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY
})

const generateUploadURL = async () => {

	const date = new Date();
	const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

	return await s3.getSignedUrlPromise('putObject' , {
		Bucket: '  ', //put your bucket name in this
		Key: imageName,
		Expires : 1000 , 
		ContentType : "image/jpeg"
	})
}



    
    const formatDatatoSend = (user) => {

        const access_token = jwt.sign({ id: user._id} , process.env.SECRET_ACCESS_KEY)

        return {
        access_token,
        profile_img : user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    
        }
    }
    

    const generateUsername = async (email) => {
        let username = email.split("@")[0];
        
        let isUsernameNotUnique = await User.exists({ "personal_info.username" : username }).then((result) => result)
        
        isUsernameNotUnique ? username += nanoid().substring(0 , 5) : "";
        
        return username;
        
        }
        

//upload image url route

server.geet('/get-upload-url', (req, res) => {
	generateUploadURL().then(url=> res.status(200).json({ uploadURL : url}))
	.catch (err => {
		console.log(err.message);
		return res.status(500).json({ error: err.message })
	})
})



 server.post("/signup", (req, res) => {


    let { fullname, email, password } = req.body;

//validating the data from frontend

    if (fullname.length <3) {
        return res.status(403).json({ "error" : "Fullname must be at least 3 letters long" })
    }
    
    if (!email.length) {
        return res.status(403).json({ "error" : "Enter Email" })
    }

    if (!emailRegex.test(email)) {
        return res.status(403).json({ "error" : "Email is invalid" })
    }

    if (!passwordRegex.test(password)) {
        return res.status(403).json({ "error" : "Password should be 6 to 20 characters long with anumeric, 1 lowercase and 1 uppercase letter" })
    }

    bcrypt.hash(password, 10, async (err, hashed_password) => {


            let username = await generateUsername(email); 
            
            let user = new User ({
            personal_info: {fullname, email, password: hashed_password, username }
            })
            
            user.save().then((u) => {
            return res.status(200).json(formatDataToSend(u))
            
            })
            
            
            .catch(err=> {

                if (err.code ==11000) {
                    return res.status(500).json({"error": "email already exists" })
                }

                return res.status(500).json({"error" : err.message})
            })
        
        
        })
        
        
    })
    
    


    server.post("/signin" , (req, res) => {

        let {email, password} = req.body;
        
        User.findOne({ "personal_info.email": email })
        
        .then((user)=> {
        if (!user){
            return res.status(403).json({ "error" : "Email not found" });
        }

        bcrypt.compare(password, user.personal_info.password, (err, result) => {

            if (err) {
            return res.status(403).json({"error": "Error occured while login please try again"});
        }
        
        if (!result){
            return res.status(403).json({"error" : "Incorrect password" })
        } else {
            return res.status(200).json(formatDatatoSend(user))
        }
        })

        
    })
        .catch(err=> {
            console.log(err);
            return res.status(500).json({ "error" : err.message })
        })
        
    })

server.listen(PORT , () => {
	console.log('listening on port -> ' + PORT);
})







//TODO: for one, the server is not wroking, there is some issue with mongo servers, i coudn't understand how to resolve that issue. so i have written down the code as shown in the tutorial, but couldn't do the testing part.
    
//PS: the code is a bit messy with the gaps and etc, sorry


//NOTE: I have not connected the server to the AWS because i would have to make an account (which would require me to give bank details for some reason) and also i figured that my account is probably not going to be used anyways i can get away with not doing that.
//TODO: make a S3 bucket in AWS server and connect the aws to the server, to do that, you will have to generate some information from the s3 bucket that you create, i have provided the structure of the code for it, so you just have to put in the values.
//      the tutorial to this will be in this link <https://youtu.be/pGFy_uGtpCA?list=PLqm86YkewF6QbR7QwqYWcAbl70Zhv0JUE&t=1864>. 
