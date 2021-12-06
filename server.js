const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const fs = require('fs');
const assert = require('assert');
const formidable = require('formidable');
const mongourl = 'mongodb+srv://victor:E8d423dd0@cluster0.02hkx.mongodb.net/miniproject?retryWrites=true&w=majority';
//const mongourl='mongodb:victor:E8d423dd0@cluster0-shard-00-00.02hkx.mongodb.net:27017,cluster0-shard-00-01.02hkx.mongodb.net:27017,cluster0-shard-00-02.02hkx.mongodb.net:27017/miniproject?ssl=true&replicaSet=atlas-4cctjs-shard-0&authSource=admin&retryWrites=true&w=majority';
const dbName = 'miniproject';
const collName = "test";
const SECRETKEY = 'I want to pass COMPS381F';
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine','ejs');

app.use(session({
    name: 'seesion' ,
    keys: [SECRETKEY] 
}));

const users = new Array(
	{username: 'student', password: ''},
    {username: 'demo', password: ''}
);

const findDocument = (db, criteria, callback) => {    
    let cursor = db.collection(collName).find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const handle_Find = (res, criteria) => {   
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");                    
            res.status(200).render('home.ejs',{ nItems:docs.length, items:docs})
                       
        });
    });
}


const handle_Details=(res,criteria)=>{
    const client= new MongoClient(mongourl);    
    client.connect((err)=>{
        assert.equal(null,err);
        console.log("Connected successfuly to server");
        const db = client.db(dbName);
        let DOCID = {};
        DOCID['_id']=ObjectID(criteria._id);

        findDocument(db, DOCID, (docs)=>{
            client.close();
            console.log("Closed DB connection");            
            res.status(200).render("details.ejs", {item:docs[0]})            
        });
    });    
}

const handle_Create=(res,req)=>{     
    if(req.fields.name==undefined || req.fields.name==""){        
        res.status(200).render('info', {message:`inserted one document`})      
    }else{
        var insertDoc={}  
        insertDoc['name']=req.fields.name;
        insertDoc['inv_type']=req.fields.inv_type;
        insertDoc['quantity']=req.fields.quantity;  
        var address = {}
        address.street=req.fields.street
        address.building=req.fields.building
        address.country=req.fields.country
        address.zipcode=req.fields.zipcode    
        address.coord=[req.fields.latitude,req.fields.longitude] 
        insertDoc['inventory_address']=address;
        insertDoc['photo'] ="";
        insertDoc['photo_mimetype']="";                
        if (req.files.photo.size > 0) {
            fs.readFile(req.files.photo.path, (err,data) => {
                assert.equal(err,null);
                insertDoc['photo'] = new Buffer.from(data).toString('base64');         
                insertDoc['photo_mimetype']=req.files.photo.type;  
            });
        }
        insertDocument(insertDoc,()=>{
            res.status(200).render('info', {message:`inserted one document`})
        })        
    }
}

const handle_Edit=(res,criteria)=>{
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        /* use Document ID for query */
        let DOCID = {};        
        DOCID['_id'] = ObjectID(criteria._id)  
        
        findDocument(db, DOCID, (docs)=>{
            client.close();
            console.log("Closed DB connection");            
            res.status(200).render("edit.ejs", {item:docs[0]})          
        });           
    });
}

const insertDocument=(insertDoc, callback)=>{
    const client=new MongoClient(mongourl)
    client.connect((err)=>{
        assert.equal(null,err)
        console.log("Connected successfully to server")
        const db=client.db("miniproject")
        db.collection(collName).insertOne(insertDoc,
            (err,results)=>{
                client.close()
                assert.equal(null,err)
                callback(results)
            })        
    })
}

const handle_Update = (res, req, criteria) => {    
    var DOCID = {};   
    //how to pass the corresponding _id
    DOCID['_id'] = ObjectID(req.fields._id);   
    var updateDoc = {};
    updateDoc['name'] = req.fields.name;
    updateDoc['inv_type'] = req.fields.inv_type;
    updateDoc['quantity'] = req.fields.quantity;
    var address={}
    address.street=req.fields.street
    address.building=req.fields.building
    address.country=req.fields.country
    address.zipcode=req.fields.zipcode    
    address.coord=[req.fields.latitude,req.fields.longitude] 
    updateDoc['inventory_address']=address;
    if (req.files.photo.size > 0) {
        fs.readFile(req.files.photo.path, (err,data) => {
            assert.equal(err,null);
            updateDoc['photo'] = new Buffer.from(data).toString('base64');
            updateDoc['photo_mimetype']=req.files.photo.type; 
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('info', {message: `Updated document(s)`})
            });
        });
    } else {
        updateDocument(DOCID, updateDoc, (results) => {
            res.status(200).render('info', {message: `Updated document(s)`})           
        });
    }  
   
}

const updateDocument = (criteria, updateDoc, callback) => {
const client = new MongoClient(mongourl);
client.connect((err) => {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);    
     db.collection(collName).updateOne(criteria,
        {
            $set : updateDoc
        },
        (err, results) => {
            client.close();
            assert.equal(err, null);
            callback(results);
        }
    );
});
}

app.get('/',(req,res)=> {   
    //console.log(req.session);
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} else {
		res.redirect('/home');
	}
    });

app.get('/login',(req,res)=> {
    res.status(200).render("login",{message: ""});   
     });

app.post('/login',(req,res)=> {

    users.forEach((user) => {
		if (user.username == req.body.username && user.password == req.body.password) {			
			req.session.authenticated = true;      
			req.session.username = req.body.username;  
            res.redirect('/home');          
        }
    });           
    res.status(200).render("login", {message: "Login failed"});   
 });

app.get('/home',(req,res)=> { 
    if(req.session.authenticated){
        res.redirect('/login')
    }else{
        handle_Find(res, req.query.docs);
        res.end(); 
    }

    });

app.get('/create',(req,res)=>{
    res.status(200).render('create')
    });

app.post('/create', (req,res) => {
        handle_Create(res, req);
        res.end();          
    })

app.get('/details',(req,res)=>{
    handle_Details(res,req.query);
    res.end();    
})

app.get('/map',(req,res)=>{
    res.status(200).render("leaflet.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
	res.end();
})

app.get('/edit',(req,res)=>{
    handle_Edit(res,req.query);
    res.end();    
})

app.post('/update',(req,res)=>{
    handle_Update(res, req, req.query);
    res.end();   
})

app.get('/delete',(req,res)=>{
    handle_Delete();
    res.end();
})



app.get('/logout',(req,res)=>{  
    req.session=null;
    res.redirect('/');
});

app.get('/api/inventory/',(req,res)=> {

})

app.get('/*', (req,res) => { 
   res.status(404).render('info', {message: `${req.path} - Unknown request!` });
});

app.listen(process.env.PORT || 8099);




