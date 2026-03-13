const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const video=document.getElementById("video");

const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");

const drawCanvas=document.getElementById("drawCanvas");
const drawCtx=drawCanvas.getContext("2d");

const bgCanvas=document.getElementById("bgCanvas");
const bgCtx=bgCanvas.getContext("2d");

const gestureElement=document.getElementById("gestureText");


/* ESCALA PARA MOVIL */

let scale=isMobile?0.7:1;

canvas.width=window.innerWidth*scale;
canvas.height=window.innerHeight*scale;

drawCanvas.width=window.innerWidth*scale;
drawCanvas.height=window.innerHeight*scale;

bgCanvas.width=window.innerWidth*scale;
bgCanvas.height=window.innerHeight*scale;



let drawColor="yellow";
let brushSize=6;

let prevX=null;
let prevY=null;

let smoothX=null;
let smoothY=null;

let sparks=[];
let particles=[];



/* PALETA */

document.querySelectorAll(".color").forEach(c=>{
c.addEventListener("click",()=>{
drawColor=c.style.background;
});
});


document.getElementById("brushSize").addEventListener("input",(e)=>{
brushSize=e.target.value;
});


document.getElementById("clearBtn").onclick=clearCanvas;
document.getElementById("mobileClear").onclick=clearCanvas;
document.getElementById("saveBtn").onclick=saveDrawing;



function clearCanvas(){
drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
}



/* PARTICULAS */

let particleCount=isMobile?30:80;

for(let i=0;i<particleCount;i++){

particles.push({

x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
size:Math.random()*2,
speed:Math.random()*0.3

});

}


function drawBackground(){

bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);

particles.forEach(p=>{

p.y+=p.speed;

if(p.y>canvas.height)p.y=0;

bgCtx.beginPath();
bgCtx.arc(p.x,p.y,p.size,0,Math.PI*2);

bgCtx.fillStyle="rgba(255,255,255,0.25)";
bgCtx.fill();

});

}



/* CHISPAS */

function createSpark(x,y){

sparks.push({

x:x,
y:y,
vx:(Math.random()-0.5)*6,
vy:(Math.random()-0.5)*6,
life:5

});

}


function updateSparks(){

for(let i=sparks.length-1;i>=0;i--){

let s=sparks[i];

s.x+=s.vx;
s.y+=s.vy;

s.life--;

ctx.beginPath();
ctx.arc(s.x,s.y,2,0,Math.PI*2);
ctx.fillStyle=drawColor;
ctx.fill();

if(s.life<=0){
sparks.splice(i,1);
}

}

}



/* DEDOS */

function fingerUp(l,tip,pip){
return l[tip].y < l[pip].y;
}



/* ESTABILIZADOR */

function stabilize(x,y){

if(smoothX===null){

smoothX=x;
smoothY=y;

return {x,y};

}

let dx=x-smoothX;
let dy=y-smoothY;

let distance=Math.sqrt(dx*dx+dy*dy);

let smoothFactor=0.15;

if(distance>40)smoothFactor=0.5;
else if(distance>20)smoothFactor=0.35;
else if(distance>10)smoothFactor=0.25;

smoothX+=dx*smoothFactor;
smoothY+=dy*smoothFactor;

return{x:smoothX,y:smoothY};

}



/* GUARDAR */

function saveDrawing(){

const link=document.createElement("a");

link.download="airdraw.png";
link.href=drawCanvas.toDataURL("image/png");

link.click();

}



/* MEDIAPIPE */

const hands=new Hands({

locateFile:(file)=>{
return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}

});


hands.setOptions({

maxNumHands:1,
modelComplexity:isMobile?0:1,
minDetectionConfidence:0.7,
minTrackingConfidence:0.7

});


hands.onResults(onResults);



function onResults(results){

drawBackground();

ctx.clearRect(0,0,canvas.width,canvas.height);

ctx.save();

ctx.scale(-1,1);
ctx.translate(-canvas.width,0);

updateSparks();



if(results.multiHandLandmarks){

ctx.globalAlpha=0.35;

for(const landmarks of results.multiHandLandmarks){

drawConnectors(ctx,landmarks,HAND_CONNECTIONS,{color:"#aaaaaa",lineWidth:3});
drawLandmarks(ctx,landmarks,{color:"#ffffff",lineWidth:1});

}

ctx.globalAlpha=1;



for(const landmarks of results.multiHandLandmarks){

const indexUp=fingerUp(landmarks,8,6);
const middleUp=fingerUp(landmarks,12,10);

let drawing=false;
let erasing=false;

let gesture="👋 Detectando";

if(indexUp&&!middleUp){

gesture="✏️ Dibujando";
drawing=true;

}

else if(indexUp&&middleUp){

gesture="🧽 Borrando";
erasing=true;

}

gestureElement.textContent=gesture;



const finger=landmarks[8];

let rawX=drawCanvas.width-(finger.x*drawCanvas.width);
let rawY=finger.y*drawCanvas.height;

let stabilized=stabilize(rawX,rawY);

let drawX=stabilized.x;
let drawY=stabilized.y;

let laserX=finger.x*canvas.width;
let laserY=finger.y*canvas.height;



ctx.beginPath();
ctx.arc(laserX,laserY,6,0,Math.PI*2);
ctx.fillStyle=drawColor;
ctx.fill();



if(drawing){

drawCtx.shadowColor=drawColor;
drawCtx.shadowBlur=20;

drawCtx.beginPath();
drawCtx.moveTo(prevX??drawX,prevY??drawY);
drawCtx.lineTo(drawX,drawY);

drawCtx.strokeStyle=drawColor;
drawCtx.lineWidth=brushSize;

drawCtx.stroke();

let sparkCount=isMobile?2:4;

for(let i=0;i<sparkCount;i++){
createSpark(laserX,laserY);
}

}



if(erasing){

drawCtx.shadowBlur=0;

drawCtx.globalCompositeOperation="destination-out";

drawCtx.beginPath();
drawCtx.arc(drawX,drawY,40,0,Math.PI*2);
drawCtx.fill();

drawCtx.globalCompositeOperation="source-over";

}



prevX=drawX;
prevY=drawY;

}

}else{

gestureElement.textContent="👋 Detectando mano";

prevX=null;
prevY=null;

smoothX=null;
smoothY=null;

}

ctx.restore();

}



const camera=new Camera(video,{

onFrame:async()=>{
await hands.send({image:video});
},

width:isMobile?640:1280,
height:isMobile?480:720

});

camera.start();