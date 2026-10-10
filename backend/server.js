require("dotenv").config();
const express=require("express"), cors=require("cors"), bcrypt=require("bcryptjs"), jwt=require("jsonwebtoken"), Database=require("better-sqlite3"), fs=require("fs"), path=require("path");
const app=express(), PORT=process.env.PORT||3000, SECRET=process.env.JWT_SECRET||"dev-secret-change-me";
const dbFile=process.env.DB_FILE||path.join(__dirname,"data","techconet57.db");
fs.mkdirSync(path.dirname(dbFile),{recursive:true});
const db=new Database(dbFile); db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS courses(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,slug TEXT UNIQUE,description TEXT,level TEXT,duration TEXT,icon TEXT,color TEXT);
CREATE TABLE IF NOT EXISTS lessons(id INTEGER PRIMARY KEY AUTOINCREMENT,course_id INTEGER,title TEXT,content TEXT,position INTEGER);
CREATE TABLE IF NOT EXISTS progress(user_id INTEGER,lesson_id INTEGER,PRIMARY KEY(user_id,lesson_id));
`);

const seed=[
["Linux for DevOps","linux-for-devops","Master Linux commands, permissions, processes, networking and services.","Beginner","6 hours","🐧","#2563eb",["Linux fundamentals","Files and directories","Users and permissions","Processes and services","Networking basics"]],
["Docker & Containers","docker-containers","Build, run and deploy containerized applications.","Beginner","7 hours","🐳","#0ea5e9",["Container concepts","Docker images","Containers","Docker Compose","Container deployment"]],
["Kubernetes Fundamentals","kubernetes-fundamentals","Learn pods, deployments, services, namespaces and configuration.","Intermediate","10 hours","☸️","#7c3aed",["Kubernetes architecture","Pods and containers","Deployments","Services","Config and secrets"]],
["Ansible Automation","ansible-automation","Automate Linux servers and application deployments.","Intermediate","8 hours","⚙️","#dc2626",["Ansible architecture","Inventory and SSH","Playbooks","Roles and templates","Deployment automation"]],
["GitHub Actions CI/CD","github-actions-cicd","Build CI pipelines and automate application delivery.","Intermediate","7 hours","🚀","#111827",["CI/CD concepts","Workflow files","Automated testing","Build and publish","Deployment pipeline"]]
];
for(const c of seed){
  db.prepare(`INSERT OR IGNORE INTO courses(title,slug,description,level,duration,icon,color) VALUES(?,?,?,?,?,?,?)`).run(...c.slice(0,7));
  const course=db.prepare("SELECT id FROM courses WHERE slug=?").get(c[1]);
  if(db.prepare("SELECT COUNT(*) n FROM lessons WHERE course_id=?").get(course.id).n===0)
    c[7].forEach((title,i)=>db.prepare("INSERT INTO lessons(course_id,title,content,position) VALUES(?,?,?,?)").run(course.id,title,`Learn ${title.toLowerCase()} through practical DevOps examples and exercises.`,i+1));
}

app.use(cors()); app.use(express.json());

function auth(req,res,next){
  const h=req.headers.authorization||"";
  try{req.user=jwt.verify(h.startsWith("Bearer ")?h.slice(7):"",SECRET);next()}
  catch{return res.status(401).json({error:"Authentication required"})}
}
function token(u){return jwt.sign({id:u.id,name:u.name,email:u.email},SECRET,{expiresIn:"7d"})}

app.get("/health",(req,res)=>res.json({status:"ok",service:"techconet57"}));

app.post("/api/auth/register",async(req,res)=>{
  const {name,email,password}=req.body;
  if(!name||!email||!password||password.length<6)return res.status(400).json({error:"Name, email and password (6+ chars) are required"});
  const e=email.trim().toLowerCase();
  if(db.prepare("SELECT id FROM users WHERE email=?").get(e))return res.status(409).json({error:"Email already registered"});
  const r=db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(name.trim(),e,await bcrypt.hash(password,10));
  const u={id:r.lastInsertRowid,name:name.trim(),email:e};
  res.status(201).json({token:token(u),user:u});
});

app.post("/api/auth/login",async(req,res)=>{
  const u=db.prepare("SELECT * FROM users WHERE email=?").get((req.body.email||"").trim().toLowerCase());
  if(!u||!(await bcrypt.compare(req.body.password||"",u.password)))return res.status(401).json({error:"Invalid email or password"});
  const safe={id:u.id,name:u.name,email:u.email}; res.json({token:token(safe),user:safe});
});

app.get("/api/me",auth,(req,res)=>res.json({user:db.prepare("SELECT id,name,email FROM users WHERE id=?").get(req.user.id)}));

app.get("/api/courses",(req,res)=>{
  const q=(req.query.search||"").trim(), like=`%${q}%`;
  const courses=db.prepare(`SELECT c.*,(SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) lesson_count FROM courses c
    WHERE ?='' OR c.title LIKE ? OR c.description LIKE ? OR c.level LIKE ? ORDER BY c.id`).all(q,like,like,like);
  res.json({courses});
});

app.get("/api/courses/:slug",(req,res)=>{
  const c=db.prepare("SELECT * FROM courses WHERE slug=?").get(req.params.slug);
  if(!c)return res.status(404).json({error:"Course not found"});
  c.lessons=db.prepare("SELECT id,title,content,position FROM lessons WHERE course_id=? ORDER BY position").all(c.id);
  res.json({course:c});
});

app.get("/api/progress",auth,(req,res)=>res.json({progress:db.prepare("SELECT lesson_id FROM progress WHERE user_id=?").all(req.user.id)}));

app.post("/api/progress/:id",auth,(req,res)=>{
  const id=Number(req.params.id);
  if(!db.prepare("SELECT id FROM lessons WHERE id=?").get(id))return res.status(404).json({error:"Lesson not found"});
  db.prepare("INSERT OR IGNORE INTO progress(user_id,lesson_id) VALUES(?,?)").run(req.user.id,id);
  res.json({ok:true});
});

app.delete("/api/progress/:id",auth,(req,res)=>{
  db.prepare("DELETE FROM progress WHERE user_id=? AND lesson_id=?").run(req.user.id,Number(req.params.id));
  res.json({ok:true});
});

app.get("/api/dashboard",auth,(req,res)=>{
  const total=db.prepare("SELECT COUNT(*) n FROM lessons").get().n;
  const done=db.prepare("SELECT COUNT(*) n FROM progress WHERE user_id=?").get(req.user.id).n;
  const courses=db.prepare("SELECT COUNT(*) n FROM courses").get().n;
  res.json({courses,totalLessons:total,completedLessons:done,percentage:total?Math.round(done/total*100):0});
});

app.listen(PORT,"0.0.0.0",()=>console.log(`API listening on ${PORT}`));
