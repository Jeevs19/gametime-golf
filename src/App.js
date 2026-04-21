/* eslint-disable */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcDist(a,b,c,d){
  const R=6371000,f1=a*Math.PI/180,f2=c*Math.PI/180,df=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180;
  const x=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))*1.09361);
}
function wDir(d){return["N","NE","E","SE","S","SW","W","NW"][Math.round(d/45)%8];}
function wStr(m){
  if(m<5) return{l:"Calm",    c:"#6b7280"};
  if(m<12)return{l:"Light",   c:"#4ade80"};
  if(m<20)return{l:"Moderate",c:"#fbbf24"};
  return      {l:"Strong",   c:"#f87171"};
}
function scColor(s,p){const d=s-p;if(d<=-2)return"#f59e0b";if(d===-1)return"#4ade80";if(d===0)return"#e8dcc8";if(d===1)return"#fb923c";return"#f87171";}
const sgColor=v=>v>0.5?"#4ade80":v>0?"#86efac":v>-0.5?"#fbbf24":"#f87171";
const sgLabel=v=>v>0?`+${v}`:String(v);
function blankHole(par=4,yards=0,hdcp=1){return{par,yards,hdcp,shots:[],putts:0,scoreAdj:0};}
function autoScore(h){return h.shots.length+h.putts+(h.shots.some(s=>s.penalty)?1:0);}
function finalScore(h){return Math.max(1,autoScore(h)+h.scoreAdj);}

// ─── Course DB ────────────────────────────────────────────────────────────────
// green: {front, back} = yards from center. hazards: [{type,label,front,carry,side}]
const COURSES = [
  { id:"pebble", name:"Pebble Beach Golf Links", city:"Pebble Beach", state:"CA",
    holes:[
      {par:4,hdcp:8,  tees:{blue:377,white:360,gold:343,red:295}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Fairway Bunker L",front:210,carry:225,side:"left"}]},
      {par:5,hdcp:12, tees:{blue:502,white:484,gold:467,red:410}, green:{front:15,back:28}, hazards:[{type:"bunker",label:"Bunker R",front:260,carry:275,side:"right"},{type:"water",label:"Ocean L",front:300,carry:320,side:"left"}]},
      {par:4,hdcp:14, tees:{blue:388,white:373,gold:345,red:300}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Greenside Bunker",front:355,carry:370,side:"right"}]},
      {par:4,hdcp:4,  tees:{blue:331,white:320,gold:302,red:280}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker L",front:180,carry:195,side:"left"}]},
      {par:3,hdcp:18, tees:{blue:195,white:180,gold:166,red:140}, green:{front:8, back:18}, hazards:[{type:"water",label:"Ocean R",front:160,carry:180,side:"right"}]},
      {par:5,hdcp:6,  tees:{blue:516,white:501,gold:479,red:430}, green:{front:14,back:26}, hazards:[{type:"bunker",label:"Fairway Bunker",front:220,carry:240,side:"right"},{type:"water",label:"Ocean L",front:400,carry:420,side:"left"}]},
      {par:3,hdcp:16, tees:{blue:107,white:100,gold:95, red:80},  green:{front:7, back:16}, hazards:[{type:"water",label:"Stillwater Cove R",front:80,carry:100,side:"right"}]},
      {par:4,hdcp:2,  tees:{blue:431,white:418,gold:394,red:350}, green:{front:13,back:24}, hazards:[{type:"bunker",label:"Bunker R",front:195,carry:210,side:"right"}]},
      {par:4,hdcp:10, tees:{blue:464,white:450,gold:426,red:380}, green:{front:12,back:22}, hazards:[{type:"water",label:"Carmel Bay L",front:240,carry:265,side:"left"}]},
      {par:4,hdcp:7,  tees:{blue:446,white:430,gold:408,red:365}, green:{front:11,back:20}, hazards:[{type:"bunker",label:"Bunker",front:220,carry:235,side:"right"}]},
      {par:4,hdcp:11, tees:{blue:381,white:367,gold:348,red:305}, green:{front:10,back:19}, hazards:[{type:"bunker",label:"Bunker L",front:195,carry:210,side:"left"}]},
      {par:3,hdcp:15, tees:{blue:202,white:187,gold:173,red:145}, green:{front:8, back:17}, hazards:[{type:"water",label:"Ocean Both",front:155,carry:175,side:"both"}]},
      {par:4,hdcp:3,  tees:{blue:392,white:378,gold:355,red:315}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Fairway Bunker R",front:200,carry:215,side:"right"}]},
      {par:5,hdcp:13, tees:{blue:573,white:555,gold:530,red:475}, green:{front:16,back:28}, hazards:[{type:"bunker",label:"Bunker L",front:280,carry:298,side:"left"}]},
      {par:4,hdcp:1,  tees:{blue:397,white:383,gold:360,red:320}, green:{front:11,back:21}, hazards:[{type:"water",label:"Carmel Bay L",front:200,carry:220,side:"left"}]},
      {par:4,hdcp:9,  tees:{blue:403,white:388,gold:365,red:325}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker R",front:230,carry:248,side:"right"}]},
      {par:3,hdcp:17, tees:{blue:178,white:163,gold:150,red:128}, green:{front:8, back:16}, hazards:[{type:"water",label:"Ocean L",front:145,carry:165,side:"left"}]},
      {par:5,hdcp:5,  tees:{blue:543,white:524,gold:497,red:445}, green:{front:15,back:27}, hazards:[{type:"water",label:"Carmel Bay L",front:280,carry:300,side:"left"},{type:"bunker",label:"Bunker R",front:320,carry:338,side:"right"}]},
    ]
  },
  { id:"torrey_south", name:"Torrey Pines South", city:"La Jolla", state:"CA",
    holes:[
      {par:4,hdcp:7,  tees:{black:452,blue:432,white:410,gold:380,red:340}, green:{front:12,back:24}, hazards:[{type:"bunker",label:"Bunker R",front:235,carry:250,side:"right"}]},
      {par:4,hdcp:11, tees:{black:389,blue:370,white:352,gold:328,red:295}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker L",front:180,carry:195,side:"left"}]},
      {par:3,hdcp:17, tees:{black:196,blue:180,white:166,gold:150,red:130}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Greenside Bunker",front:150,carry:168,side:"left"}]},
      {par:4,hdcp:1,  tees:{black:453,blue:435,white:414,gold:385,red:345}, green:{front:13,back:25}, hazards:[{type:"bunker",label:"Fairway Bunker",front:240,carry:258,side:"right"}]},
      {par:5,hdcp:9,  tees:{black:570,blue:550,white:524,gold:492,red:445}, green:{front:15,back:28}, hazards:[{type:"bunker",label:"Bunker L",front:275,carry:292,side:"left"},{type:"bunker",label:"Bunker R",front:310,carry:328,side:"right"}]},
      {par:3,hdcp:15, tees:{black:194,blue:178,white:164,gold:148,red:128}, green:{front:8, back:17}, hazards:[{type:"bunker",label:"Front Bunker",front:145,carry:162,side:"left"}]},
      {par:4,hdcp:3,  tees:{black:454,blue:436,white:415,gold:387,red:347}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Fairway Bunker R",front:225,carry:242,side:"right"}]},
      {par:4,hdcp:13, tees:{black:447,blue:430,white:409,gold:381,red:342}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker L",front:215,carry:232,side:"left"}]},
      {par:5,hdcp:5,  tees:{black:604,blue:581,white:553,gold:519,red:466}, green:{front:16,back:30}, hazards:[{type:"bunker",label:"Bunker R",front:290,carry:308,side:"right"}]},
      {par:4,hdcp:6,  tees:{black:408,blue:392,white:373,gold:347,red:311}, green:{front:11,back:20}, hazards:[{type:"bunker",label:"Fairway Bunker",front:200,carry:217,side:"left"}]},
      {par:3,hdcp:18, tees:{black:223,blue:206,white:190,gold:172,red:148}, green:{front:9, back:18}, hazards:[{type:"bunker",label:"Greenside L",front:170,carry:188,side:"left"}]},
      {par:4,hdcp:10, tees:{black:500,blue:481,white:458,gold:428,red:384}, green:{front:13,back:24}, hazards:[{type:"water",label:"Pond L",front:260,carry:278,side:"left"}]},
      {par:5,hdcp:14, tees:{black:565,blue:543,white:517,gold:484,red:435}, green:{front:15,back:27}, hazards:[{type:"bunker",label:"Bunker R",front:270,carry:288,side:"right"}]},
      {par:4,hdcp:2,  tees:{black:456,blue:438,white:417,gold:389,red:349}, green:{front:12,back:23}, hazards:[{type:"bunker",label:"Fairway Bunker",front:230,carry:248,side:"right"}]},
      {par:3,hdcp:16, tees:{black:155,blue:142,white:130,gold:116,red:99},  green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:108,carry:125,side:"both"}]},
      {par:4,hdcp:4,  tees:{black:411,blue:394,white:375,gold:349,red:314}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Fairway Bunker L",front:198,carry:215,side:"left"}]},
      {par:4,hdcp:12, tees:{black:400,blue:384,white:365,gold:340,red:305}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker R",front:188,carry:205,side:"right"}]},
      {par:5,hdcp:8,  tees:{black:521,blue:500,white:476,gold:445,red:400}, green:{front:14,back:26}, hazards:[{type:"bunker",label:"Bunker L",front:280,carry:298,side:"left"}]},
    ]
  },
  { id:"tpc_sawgrass", name:"TPC Sawgrass Stadium", city:"Ponte Vedra Beach", state:"FL",
    holes:[
      {par:4,hdcp:9,  tees:{black:423,blue:406,white:385,gold:356,red:320}, green:{front:11,back:22}, hazards:[{type:"water",label:"Pond L",front:185,carry:200,side:"left"}]},
      {par:5,hdcp:13, tees:{black:532,blue:514,white:489,gold:457,red:410}, green:{front:13,back:25}, hazards:[{type:"water",label:"Marsh L",front:260,carry:278,side:"left"}]},
      {par:3,hdcp:17, tees:{black:177,blue:162,white:149,gold:134,red:116}, green:{front:8, back:17}, hazards:[{type:"water",label:"Moat (island)",front:130,carry:155,side:"both"}]},
      {par:4,hdcp:3,  tees:{black:384,blue:369,white:351,gold:327,red:293}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker R",front:190,carry:207,side:"right"}]},
      {par:4,hdcp:1,  tees:{black:466,blue:449,white:428,gold:399,red:358}, green:{front:12,back:23}, hazards:[{type:"water",label:"Marsh L",front:235,carry:252,side:"left"},{type:"bunker",label:"Bunker R",front:275,carry:292,side:"right"}]},
      {par:4,hdcp:11, tees:{black:393,blue:378,white:360,gold:335,red:301}, green:{front:10,back:20}, hazards:[{type:"water",label:"Pond R",front:205,carry:222,side:"right"}]},
      {par:5,hdcp:7,  tees:{black:442,blue:425,white:404,gold:377,red:338}, green:{front:14,back:26}, hazards:[{type:"water",label:"Marsh L",front:280,carry:298,side:"left"}]},
      {par:3,hdcp:15, tees:{black:219,blue:200,white:182,gold:164,red:147}, green:{front:8, back:16}, hazards:[{type:"water",label:"Pond (surrounds green)",front:160,carry:182,side:"both"}]},
      {par:4,hdcp:5,  tees:{black:583,blue:565,white:538,gold:503,red:451}, green:{front:15,back:28}, hazards:[{type:"water",label:"Marsh Both",front:295,carry:315,side:"both"}]},
      {par:4,hdcp:2,  tees:{black:424,blue:408,white:388,gold:362,red:325}, green:{front:11,back:21}, hazards:[{type:"water",label:"Pond L",front:215,carry:232,side:"left"}]},
      {par:5,hdcp:12, tees:{black:558,blue:538,white:512,gold:479,red:430}, green:{front:14,back:26}, hazards:[{type:"water",label:"Marsh L",front:300,carry:320,side:"left"}]},
      {par:4,hdcp:6,  tees:{black:358,blue:344,white:327,gold:305,red:274}, green:{front:10,back:20}, hazards:[{type:"water",label:"Pond R",front:178,carry:196,side:"right"}]},
      {par:3,hdcp:16, tees:{black:181,blue:163,white:147,gold:132,red:116}, green:{front:8, back:16}, hazards:[{type:"water",label:"Pond (island green)",front:115,carry:145,side:"both"}]},
      {par:5,hdcp:10, tees:{black:467,blue:449,white:427,gold:399,red:357}, green:{front:13,back:25}, hazards:[{type:"water",label:"Marsh L",front:280,carry:298,side:"left"},{type:"bunker",label:"Bunker R",front:310,carry:328,side:"right"}]},
      {par:4,hdcp:4,  tees:{black:449,blue:432,white:411,gold:383,red:344}, green:{front:11,back:21}, hazards:[{type:"water",label:"Marsh R",front:220,carry:238,side:"right"}]},
      {par:5,hdcp:14, tees:{black:497,blue:478,white:455,gold:425,red:381}, green:{front:14,back:26}, hazards:[{type:"water",label:"Marsh Both",front:285,carry:305,side:"both"}]},
      {par:3,hdcp:18, tees:{black:132,blue:118,white:105,gold:93, red:81},  green:{front:8, back:16}, hazards:[{type:"water",label:"Pond (island)",front:82,carry:108,side:"both"}]},
      {par:4,hdcp:8,  tees:{black:440,blue:423,white:402,gold:375,red:336}, green:{front:11,back:22}, hazards:[{type:"water",label:"Marsh L",front:225,carry:243,side:"left"}]},
    ]
  },
  { id:"bethpage_black", name:"Bethpage Black", city:"Farmingdale", state:"NY",
    holes:[
      {par:4,hdcp:9,  tees:{black:430,blue:415,white:395,gold:368,red:330}, green:{front:11,back:22}, hazards:[{type:"bunker",label:"Rough Hollow L",front:220,carry:238,side:"left"}]},
      {par:4,hdcp:7,  tees:{black:389,blue:374,white:356,gold:331,red:297}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Fairway Bunker",front:188,carry:205,side:"right"}]},
      {par:3,hdcp:17, tees:{black:230,blue:214,white:197,gold:178,red:153}, green:{front:9, back:18}, hazards:[{type:"bunker",label:"Front Bunker",front:188,carry:208,side:"both"}]},
      {par:5,hdcp:3,  tees:{black:517,blue:497,white:473,gold:442,red:397}, green:{front:13,back:25}, hazards:[{type:"bunker",label:"Bunker L",front:270,carry:288,side:"left"},{type:"bunker",label:"Bunker R",front:310,carry:328,side:"right"}]},
      {par:4,hdcp:1,  tees:{black:453,blue:436,white:415,gold:387,red:348}, green:{front:12,back:24}, hazards:[{type:"bunker",label:"Fairway Bunker R",front:235,carry:252,side:"right"}]},
      {par:4,hdcp:13, tees:{black:408,blue:393,white:374,gold:348,red:313}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker L",front:200,carry:217,side:"left"}]},
      {par:5,hdcp:11, tees:{black:537,blue:517,white:492,gold:460,red:413}, green:{front:14,back:27}, hazards:[{type:"bunker",label:"Bunker R",front:280,carry:298,side:"right"}]},
      {par:3,hdcp:15, tees:{black:210,blue:195,white:180,gold:162,red:140}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:168,carry:186,side:"both"}]},
      {par:4,hdcp:5,  tees:{black:432,blue:415,white:395,gold:368,red:330}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Fairway Bunker L",front:215,carry:232,side:"left"}]},
      {par:4,hdcp:6,  tees:{black:492,blue:474,white:451,gold:421,red:378}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker R",front:240,carry:257,side:"right"}]},
      {par:4,hdcp:2,  tees:{black:435,blue:419,white:399,gold:372,red:334}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Bunker L",front:218,carry:235,side:"left"}]},
      {par:3,hdcp:18, tees:{black:202,blue:187,white:173,gold:156,red:135}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:160,carry:178,side:"right"}]},
      {par:4,hdcp:4,  tees:{black:417,blue:401,white:382,gold:356,red:320}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Fairway Bunker",front:208,carry:225,side:"left"}]},
      {par:5,hdcp:16, tees:{black:535,blue:515,white:490,gold:459,red:412}, green:{front:13,back:25}, hazards:[{type:"bunker",label:"Bunker L",front:280,carry:298,side:"left"}]},
      {par:4,hdcp:10, tees:{black:410,blue:394,white:375,gold:349,red:314}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker R",front:200,carry:218,side:"right"}]},
      {par:3,hdcp:14, tees:{black:213,blue:198,white:183,gold:165,red:143}, green:{front:9, back:18}, hazards:[{type:"bunker",label:"Front Bunker",front:168,carry:186,side:"both"}]},
      {par:4,hdcp:8,  tees:{black:410,blue:394,white:375,gold:349,red:314}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Fairway Bunker R",front:200,carry:218,side:"right"}]},
      {par:4,hdcp:12, tees:{black:411,blue:395,white:376,gold:350,red:314}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker L",front:198,carry:215,side:"left"}]},
    ]
  },
  { id:"augusta", name:"Augusta National Golf Club", city:"Augusta", state:"GA",
    holes:[
      {par:4,hdcp:4,  tees:{black:445,blue:420,white:400}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Fairway Bunker L",front:230,carry:247,side:"left"}]},
      {par:5,hdcp:14, tees:{black:575,blue:545,white:518}, green:{front:15,back:28}, hazards:[{type:"water",label:"Rae's Creek",front:210,carry:228,side:"both"}]},
      {par:4,hdcp:8,  tees:{black:350,blue:335,white:318}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker R",front:180,carry:198,side:"right"}]},
      {par:3,hdcp:16, tees:{black:240,blue:220,white:205}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Bunker L",front:185,carry:205,side:"left"}]},
      {par:4,hdcp:2,  tees:{black:495,blue:470,white:450}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Bunker R",front:250,carry:268,side:"right"}]},
      {par:3,hdcp:18, tees:{black:180,blue:165,white:150}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Bunker L",front:148,carry:165,side:"left"}]},
      {par:4,hdcp:12, tees:{black:450,blue:430,white:410}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Fairway Bunker",front:220,carry:238,side:"right"}]},
      {par:5,hdcp:10, tees:{black:570,blue:545,white:520}, green:{front:14,back:26}, hazards:[{type:"water",label:"Rae's Creek",front:220,carry:240,side:"both"}]},
      {par:4,hdcp:6,  tees:{black:460,blue:440,white:420}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Fairway Bunker L",front:235,carry:252,side:"left"}]},
      {par:4,hdcp:1,  tees:{black:495,blue:470,white:450}, green:{front:13,back:24}, hazards:[{type:"bunker",label:"Bunker R",front:248,carry:265,side:"right"}]},
      {par:4,hdcp:7,  tees:{black:505,blue:480,white:460}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Bunker L",front:255,carry:272,side:"left"}]},
      {par:3,hdcp:17, tees:{black:155,blue:145,white:135}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:118,carry:138,side:"both"}]},
      {par:5,hdcp:13, tees:{black:510,blue:485,white:465}, green:{front:13,back:24}, hazards:[{type:"water",label:"Rae's Creek",front:210,carry:228,side:"both"}]},
      {par:4,hdcp:3,  tees:{black:440,blue:420,white:400}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker L",front:218,carry:236,side:"left"}]},
      {par:5,hdcp:11, tees:{black:530,blue:505,white:485}, green:{front:14,back:26}, hazards:[{type:"water",label:"Pond (15th)",front:265,carry:285,side:"both"}]},
      {par:3,hdcp:15, tees:{black:170,blue:155,white:142}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Bunker R",front:135,carry:155,side:"right"}]},
      {par:4,hdcp:5,  tees:{black:440,blue:420,white:400}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Eisenhower Area",front:218,carry:236,side:"left"}]},
      {par:4,hdcp:9,  tees:{black:465,blue:445,white:425}, green:{front:12,back:22}, hazards:[{type:"water",label:"Pond R",front:150,carry:170,side:"right"}]},
    ]
  },
  { id:"pinehurst2", name:"Pinehurst No. 2", city:"Pinehurst", state:"NC",
    holes:[
      {par:4,hdcp:9,  tees:{black:414,blue:396,white:376,gold:349,red:314}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Bunker R",front:200,carry:218,side:"right"}]},
      {par:4,hdcp:3,  tees:{black:452,blue:435,white:414,gold:386,red:347}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Fairway Bunker L",front:225,carry:242,side:"left"}]},
      {par:4,hdcp:15, tees:{black:335,blue:318,white:302,gold:280,red:252}, green:{front:10,back:20}, hazards:[{type:"bunker",label:"Bunker R",front:168,carry:185,side:"right"}]},
      {par:4,hdcp:1,  tees:{black:550,blue:530,white:506,gold:476,red:428}, green:{front:13,back:24}, hazards:[{type:"bunker",label:"Bunker L",front:275,carry:292,side:"left"}]},
      {par:5,hdcp:11, tees:{black:482,blue:463,white:441,gold:413,red:371}, green:{front:14,back:26}, hazards:[{type:"bunker",label:"Fairway Bunker",front:260,carry:278,side:"right"}]},
      {par:3,hdcp:17, tees:{black:215,blue:198,white:181,gold:163,red:146}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:168,carry:188,side:"both"}]},
      {par:4,hdcp:5,  tees:{black:400,blue:382,white:363,gold:338,red:304}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker R",front:195,carry:212,side:"right"}]},
      {par:3,hdcp:13, tees:{black:185,blue:167,white:150,gold:133,red:119}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:148,carry:168,side:"both"}]},
      {par:4,hdcp:7,  tees:{black:445,blue:428,white:408,gold:381,red:343}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Bunker L",front:218,carry:235,side:"left"}]},
      {par:4,hdcp:4,  tees:{black:611,blue:450,white:428,gold:400,red:360}, green:{front:13,back:25}, hazards:[{type:"bunker",label:"Fairway Bunker",front:320,carry:338,side:"right"}]},
      {par:4,hdcp:10, tees:{black:458,blue:440,white:419,gold:391,red:352}, green:{front:12,back:22}, hazards:[{type:"bunker",label:"Bunker R",front:228,carry:245,side:"right"}]},
      {par:4,hdcp:14, tees:{black:434,blue:418,white:398,gold:371,red:334}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker L",front:210,carry:228,side:"left"}]},
      {par:5,hdcp:2,  tees:{black:432,blue:416,white:396,gold:369,red:332}, green:{front:13,back:24}, hazards:[{type:"bunker",label:"Fairway Bunker R",front:270,carry:288,side:"right"}]},
      {par:4,hdcp:16, tees:{black:422,blue:404,white:385,gold:359,red:323}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker R",front:205,carry:222,side:"right"}]},
      {par:4,hdcp:6,  tees:{black:205,blue:190,white:176,gold:160,red:144}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Bunker L",front:205,carry:222,side:"left"}]},
      {par:3,hdcp:18, tees:{black:440,blue:424,white:404,gold:377,red:339}, green:{front:8, back:16}, hazards:[{type:"bunker",label:"Front Bunker",front:158,carry:178,side:"both"}]},
      {par:4,hdcp:8,  tees:{black:437,blue:420,white:400,gold:373,red:336}, green:{front:11,back:21}, hazards:[{type:"bunker",label:"Fairway Bunker",front:215,carry:232,side:"left"}]},
      {par:4,hdcp:12, tees:{black:520,blue:500,white:476,gold:446,red:401}, green:{front:13,back:24}, hazards:[{type:"bunker",label:"Bunker L",front:260,carry:278,side:"left"}]},
    ]
  },
];

const TEE_META={black:{label:"Black",hex:"#374151"},blue:{label:"Blue",hex:"#2563eb"},white:{label:"White",hex:"#d1d5db"},gold:{label:"Gold",hex:"#ca8a04"},red:{label:"Red",hex:"#dc2626"}};

// ─── Other constants ──────────────────────────────────────────────────────────
const DEFAULT_CLUBS=[
  {id:"d",name:"Driver",sel:true},{id:"3w",name:"3 Wood",sel:true},{id:"5w",name:"5 Wood",sel:true},
  {id:"4i",name:"4 Iron",sel:false},{id:"5i",name:"5 Iron",sel:true},{id:"6i",name:"6 Iron",sel:true},
  {id:"7i",name:"7 Iron",sel:true},{id:"8i",name:"8 Iron",sel:true},{id:"9i",name:"9 Iron",sel:true},
  {id:"pw",name:"PW",sel:true},{id:"gw",name:"GW",sel:true},{id:"sw",name:"SW",sel:true},
  {id:"lw",name:"LW",sel:false},{id:"put",name:"Putter",sel:true},
];
const CLUBS=["Driver","3W","5W","4i","5i","6i","7i","8i","9i","PW","GW","SW","LW","Putter"];
const LIES=[
  {id:"tee",     label:"Tee Box", emoji:"🟦",color:"#3b82f6",penalty:false},
  {id:"fairway", label:"Fairway", emoji:"🟩",color:"#22c55e",penalty:false},
  {id:"rough",   label:"Rough",   emoji:"🟫",color:"#92400e",penalty:false},
  {id:"bunker",  label:"Bunker",  emoji:"🏖️",color:"#d97706",penalty:false},
  {id:"water_ob",label:"Water/OB",emoji:"💧",color:"#0ea5e9",penalty:true},
  {id:"green",   label:"Green",   emoji:"⛳",color:"#16a34a",penalty:false},
  {id:"trees",   label:"Trees",   emoji:"🌲",color:"#15803d",penalty:false},
];
const DIRS =[{id:"left",label:"Left",emoji:"◀"},{id:"center",label:"On Line",emoji:"⬆"},{id:"right",label:"Right",emoji:"▶"}];

const SS={IDLE:"idle",CLUB:"club",READY:"ready",FLIGHT:"flight",LAND:"land",PUTT:"putt"};

// ─── Dummy rounds ─────────────────────────────────────────────────────────────
const DUMMY_ROUNDS=[
  // Round 1 — Pebble Beach, 82
  {id:"r1",date:"2026-03-22",course:"Pebble Beach Golf Links",tees:"Blue",score:82,par:72,holes:[
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s101",club:"Driver",lie:"fairway",direction:"center",distYards:265},{id:"s102",club:"9i",lie:"green",direction:"center",distYards:112}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s103",club:"Driver",lie:"fairway",direction:"center",distYards:272},{id:"s104",club:"5W",lie:"fairway",direction:"center",distYards:198},{id:"s105",club:"GW",lie:"green",direction:"center",distYards:52}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s106",club:"Driver",lie:"rough",direction:"right",distYards:240},{id:"s107",club:"7i",lie:"rough",direction:"left",distYards:148},{id:"s108",club:"SW",lie:"green",direction:"center",distYards:28}]},
    {par:4,score:4,putts:1,fir:true, gir:true, shots:[{id:"s109",club:"Driver",lie:"fairway",direction:"center",distYards:260},{id:"s110",club:"PW",lie:"green",direction:"center",distYards:105}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s111",club:"6i",lie:"green",direction:"center",distYards:172}]},
    {par:5,score:6,putts:2,fir:false,gir:false,shots:[{id:"s112",club:"Driver",lie:"bunker",direction:"right",distYards:235},{id:"s113",club:"SW",lie:"rough",direction:"center",distYards:68},{id:"s114",club:"5i",lie:"rough",direction:"center",distYards:155},{id:"s115",club:"GW",lie:"green",direction:"right",distYards:42}]},
    {par:3,score:4,putts:3,fir:true, gir:false,shots:[{id:"s116",club:"8i",lie:"rough",direction:"left",distYards:152},{id:"s117",club:"SW",lie:"green",direction:"center",distYards:22}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s118",club:"Driver",lie:"fairway",direction:"center",distYards:258},{id:"s119",club:"9i",lie:"green",direction:"center",distYards:118}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s120",club:"Driver",lie:"water_ob",direction:"right",distYards:220,penalty:true},{id:"s121",club:"Driver",lie:"fairway",direction:"center",distYards:248},{id:"s122",club:"PW",lie:"green",direction:"center",distYards:98}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s123",club:"Driver",lie:"fairway",direction:"center",distYards:262},{id:"s124",club:"8i",lie:"green",direction:"center",distYards:142}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s125",club:"Driver",lie:"rough",direction:"left",distYards:248},{id:"s126",club:"6i",lie:"rough",direction:"center",distYards:162},{id:"s127",club:"GW",lie:"green",direction:"center",distYards:48}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s128",club:"7i",lie:"green",direction:"center",distYards:158}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s129",club:"Driver",lie:"fairway",direction:"center",distYards:255},{id:"s130",club:"9i",lie:"green",direction:"center",distYards:122}]},
    {par:5,score:5,putts:1,fir:true, gir:true, shots:[{id:"s131",club:"Driver",lie:"fairway",direction:"center",distYards:268},{id:"s132",club:"5W",lie:"fairway",direction:"center",distYards:192},{id:"s133",club:"PW",lie:"green",direction:"center",distYards:88}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s134",club:"Driver",lie:"fairway",direction:"center",distYards:260},{id:"s135",club:"8i",lie:"green",direction:"center",distYards:138}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s136",club:"Driver",lie:"rough",direction:"right",distYards:242},{id:"s137",club:"7i",lie:"rough",direction:"right",distYards:152},{id:"s138",club:"SW",lie:"green",direction:"center",distYards:32}]},
    {par:3,score:2,putts:1,fir:true, gir:true, shots:[{id:"s139",club:"9i",lie:"green",direction:"center",distYards:132}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s140",club:"Driver",lie:"fairway",direction:"center",distYards:272},{id:"s141",club:"5i",lie:"fairway",direction:"center",distYards:182},{id:"s142",club:"GW",lie:"green",direction:"center",distYards:58}]},
  ]},
  // Round 2 — Torrey Pines, 79
  {id:"r2",date:"2026-03-08",course:"Torrey Pines South",tees:"Blue",score:79,par:72,holes:[
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s201",club:"Driver",lie:"fairway",direction:"center",distYards:272},{id:"s202",club:"8i",lie:"green",direction:"center",distYards:145}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s203",club:"Driver",lie:"fairway",direction:"center",distYards:265},{id:"s204",club:"9i",lie:"green",direction:"center",distYards:118}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s205",club:"7i",lie:"green",direction:"center",distYards:162}]},
    {par:4,score:3,putts:1,fir:true, gir:true, shots:[{id:"s206",club:"Driver",lie:"fairway",direction:"center",distYards:275},{id:"s207",club:"PW",lie:"green",direction:"center",distYards:92}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s208",club:"Driver",lie:"fairway",direction:"center",distYards:270},{id:"s209",club:"5W",lie:"fairway",direction:"center",distYards:195},{id:"s210",club:"GW",lie:"green",direction:"center",distYards:55}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s211",club:"6i",lie:"green",direction:"center",distYards:168}]},
    {par:4,score:4,putts:2,fir:false,gir:true, shots:[{id:"s212",club:"Driver",lie:"rough",direction:"left",distYards:255},{id:"s213",club:"8i",lie:"green",direction:"center",distYards:148}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s214",club:"Driver",lie:"rough",direction:"right",distYards:245},{id:"s215",club:"7i",lie:"rough",direction:"right",distYards:155},{id:"s216",club:"SW",lie:"green",direction:"center",distYards:35}]},
    {par:5,score:4,putts:1,fir:true, gir:true, shots:[{id:"s217",club:"Driver",lie:"fairway",direction:"center",distYards:278},{id:"s218",club:"3W",lie:"fairway",direction:"center",distYards:215},{id:"s219",club:"PW",lie:"green",direction:"center",distYards:82}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s220",club:"Driver",lie:"fairway",direction:"center",distYards:264},{id:"s221",club:"9i",lie:"green",direction:"center",distYards:115}]},
    {par:3,score:2,putts:1,fir:true, gir:true, shots:[{id:"s222",club:"8i",lie:"green",direction:"center",distYards:145}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s223",club:"Driver",lie:"fairway",direction:"center",distYards:268},{id:"s224",club:"PW",lie:"green",direction:"center",distYards:95}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s225",club:"Driver",lie:"fairway",direction:"center",distYards:272},{id:"s226",club:"5i",lie:"fairway",direction:"center",distYards:185},{id:"s227",club:"GW",lie:"green",direction:"center",distYards:62}]},
    {par:4,score:4,putts:2,fir:false,gir:true, shots:[{id:"s228",club:"Driver",lie:"rough",direction:"left",distYards:252},{id:"s229",club:"7i",lie:"green",direction:"center",distYards:158}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s230",club:"9i",lie:"green",direction:"center",distYards:125}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s231",club:"Driver",lie:"fairway",direction:"center",distYards:266},{id:"s232",club:"8i",lie:"green",direction:"center",distYards:142}]},
    {par:4,score:4,putts:1,fir:true, gir:true, shots:[{id:"s233",club:"Driver",lie:"fairway",direction:"center",distYards:270},{id:"s234",club:"PW",lie:"green",direction:"center",distYards:88}]},
    {par:5,score:5,putts:1,fir:true, gir:true, shots:[{id:"s235",club:"Driver",lie:"fairway",direction:"center",distYards:275},{id:"s236",club:"5W",lie:"fairway",direction:"center",distYards:200},{id:"s237",club:"SW",lie:"green",direction:"center",distYards:42}]},
  ]},
  // Round 3 — TPC Sawgrass, 86
  {id:"r3",date:"2026-02-14",course:"TPC Sawgrass Stadium",tees:"Blue",score:86,par:72,holes:[
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s301",club:"Driver",lie:"rough",direction:"right",distYards:248},{id:"s302",club:"7i",lie:"rough",direction:"right",distYards:148},{id:"s303",club:"SW",lie:"green",direction:"center",distYards:28}]},
    {par:5,score:6,putts:3,fir:false,gir:false,shots:[{id:"s304",club:"Driver",lie:"rough",direction:"left",distYards:242},{id:"s305",club:"5W",lie:"rough",direction:"left",distYards:182},{id:"s306",club:"GW",lie:"rough",direction:"left",distYards:48},{id:"s307",club:"SW",lie:"green",direction:"center",distYards:18}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s308",club:"7i",lie:"green",direction:"center",distYards:158}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s309",club:"Driver",lie:"fairway",direction:"center",distYards:260},{id:"s310",club:"9i",lie:"green",direction:"center",distYards:122}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s311",club:"Driver",lie:"rough",direction:"right",distYards:235},{id:"s312",club:"6i",lie:"rough",direction:"right",distYards:158},{id:"s313",club:"GW",lie:"green",direction:"center",distYards:52}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s314",club:"Driver",lie:"fairway",direction:"center",distYards:258},{id:"s315",club:"8i",lie:"green",direction:"center",distYards:145}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s316",club:"Driver",lie:"fairway",direction:"center",distYards:265},{id:"s317",club:"5i",lie:"fairway",direction:"center",distYards:180},{id:"s318",club:"PW",lie:"green",direction:"center",distYards:92}]},
    {par:3,score:4,putts:3,fir:true, gir:false,shots:[{id:"s319",club:"8i",lie:"rough",direction:"left",distYards:148},{id:"s320",club:"SW",lie:"green",direction:"center",distYards:22}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s321",club:"Driver",lie:"bunker",direction:"right",distYards:228},{id:"s322",club:"SW",lie:"rough",direction:"center",distYards:62},{id:"s323",club:"GW",lie:"green",direction:"center",distYards:45}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s324",club:"Driver",lie:"fairway",direction:"center",distYards:262},{id:"s325",club:"9i",lie:"green",direction:"center",distYards:118}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s326",club:"Driver",lie:"fairway",direction:"center",distYards:268},{id:"s327",club:"5W",lie:"fairway",direction:"center",distYards:192},{id:"s328",club:"GW",lie:"green",direction:"center",distYards:58}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s329",club:"Driver",lie:"fairway",direction:"center",distYards:255},{id:"s330",club:"PW",lie:"green",direction:"center",distYards:102}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s331",club:"6i",lie:"green",direction:"center",distYards:165}]},
    {par:5,score:6,putts:3,fir:false,gir:false,shots:[{id:"s332",club:"Driver",lie:"water_ob",direction:"right",distYards:218,penalty:true},{id:"s333",club:"Driver",lie:"rough",direction:"center",distYards:248},{id:"s334",club:"5i",lie:"rough",direction:"center",distYards:172},{id:"s335",club:"GW",lie:"green",direction:"center",distYards:48}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s336",club:"Driver",lie:"fairway",direction:"center",distYards:260},{id:"s337",club:"8i",lie:"green",direction:"center",distYards:138}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s338",club:"Driver",lie:"fairway",direction:"center",distYards:270},{id:"s339",club:"3W",lie:"fairway",direction:"center",distYards:212},{id:"s340",club:"SW",lie:"green",direction:"center",distYards:38}]},
    {par:3,score:4,putts:2,fir:false,gir:false,shots:[{id:"s341",club:"9i",lie:"rough",direction:"right",distYards:128},{id:"s342",club:"SW",lie:"green",direction:"center",distYards:25}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s343",club:"Driver",lie:"rough",direction:"left",distYards:245},{id:"s344",club:"7i",lie:"rough",direction:"left",distYards:152},{id:"s345",club:"GW",lie:"green",direction:"center",distYards:45}]},
  ]},
  // Round 4 — Pebble Beach, 84
  {id:"r4",date:"2025-12-29",course:"Pebble Beach Golf Links",tees:"Blue",score:84,par:72,holes:[
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s401",club:"Driver",lie:"fairway",direction:"center",distYards:265},{id:"s402",club:"9i",lie:"green",direction:"center",distYards:115}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s403",club:"Driver",lie:"fairway",direction:"center",distYards:272},{id:"s404",club:"5W",lie:"fairway",direction:"center",distYards:194},{id:"s405",club:"PW",lie:"green",direction:"center",distYards:88}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s406",club:"Driver",lie:"fairway",direction:"center",distYards:258},{id:"s407",club:"8i",lie:"green",direction:"center",distYards:142}]},
    {par:4,score:4,putts:1,fir:true, gir:true, shots:[{id:"s408",club:"Driver",lie:"fairway",direction:"center",distYards:262},{id:"s409",club:"PW",lie:"green",direction:"center",distYards:95}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s410",club:"6i",lie:"green",direction:"center",distYards:168}]},
    {par:5,score:5,putts:2,fir:true, gir:true, shots:[{id:"s411",club:"Driver",lie:"fairway",direction:"center",distYards:270},{id:"s412",club:"5i",lie:"fairway",direction:"center",distYards:182},{id:"s413",club:"GW",lie:"green",direction:"center",distYards:55}]},
    {par:3,score:3,putts:2,fir:true, gir:true, shots:[{id:"s414",club:"7i",lie:"green",direction:"center",distYards:155}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s415",club:"Driver",lie:"fairway",direction:"center",distYards:260},{id:"s416",club:"8i",lie:"green",direction:"center",distYards:145}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s417",club:"Driver",lie:"rough",direction:"right",distYards:240},{id:"s418",club:"6i",lie:"rough",direction:"right",distYards:155},{id:"s419",club:"SW",lie:"green",direction:"center",distYards:32}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s420",club:"Driver",lie:"fairway",direction:"center",distYards:262},{id:"s421",club:"9i",lie:"green",direction:"center",distYards:118}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s422",club:"Driver",lie:"rough",direction:"left",distYards:248},{id:"s423",club:"7i",lie:"rough",direction:"left",distYards:152},{id:"s424",club:"GW",lie:"green",direction:"center",distYards:48}]},
    {par:3,score:3,putts:1,fir:true, gir:true, shots:[{id:"s425",club:"8i",lie:"green",direction:"center",distYards:142}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s426",club:"Driver",lie:"fairway",direction:"center",distYards:255},{id:"s427",club:"9i",lie:"green",direction:"center",distYards:122}]},
    {par:5,score:5,putts:1,fir:true, gir:true, shots:[{id:"s428",club:"Driver",lie:"fairway",direction:"center",distYards:268},{id:"s429",club:"5W",lie:"fairway",direction:"center",distYards:196},{id:"s430",club:"PW",lie:"green",direction:"center",distYards:85}]},
    {par:4,score:4,putts:2,fir:true, gir:true, shots:[{id:"s431",club:"Driver",lie:"fairway",direction:"center",distYards:260},{id:"s432",club:"8i",lie:"green",direction:"center",distYards:138}]},
    {par:4,score:5,putts:2,fir:false,gir:false,shots:[{id:"s433",club:"Driver",lie:"rough",direction:"right",distYards:242},{id:"s434",club:"7i",lie:"rough",direction:"right",distYards:148},{id:"s435",club:"SW",lie:"green",direction:"center",distYards:35}]},
    {par:3,score:3,putts:1,fir:true, gir:true, shots:[{id:"s436",club:"9i",lie:"green",direction:"center",distYards:128}]},
    {par:5,score:6,putts:2,fir:true, gir:false,shots:[{id:"s437",club:"Driver",lie:"fairway",direction:"center",distYards:272},{id:"s438",club:"3W",lie:"fairway",direction:"center",distYards:208},{id:"s439",club:"5i",lie:"rough",direction:"left",distYards:172},{id:"s440",club:"SW",lie:"green",direction:"center",distYards:38}]},
  ]},
];
const DUMMY_PROFILE={id:"p1",name:"Alex Ramirez",handicap:8.4,clubs:DEFAULT_CLUBS.map(c=>({...c})),rounds:DUMMY_ROUNDS,settings:{preferredYards:6500,clubStatsWindow:10}};

// Recommend the tee closest to a golfer's preferred yardage, adjusted for course par/layout
function recommendTee(course, preferredYards){
  if(!course||!preferredYards) return null;
  const holes = course.holes;
  const par5s = holes.filter(h=>h.par===5).length;
  const par3s = holes.filter(h=>h.par===3).length;
  const stdPar5s=4, stdPar3s=4;
  // Each missing par 5 vs standard ~180y shorter; each extra par 3 ~40y shorter
  const yardAdj = (par5s-stdPar5s)*180 + (stdPar3s-par3s)*40;
  const target = preferredYards + yardAdj;
  const teeIds = Object.keys(TEE_META).filter(id=>holes[0].tees[id]!=null);
  let best=null, bestDiff=Infinity;
  teeIds.forEach(id=>{
    const total=holes.reduce((a,h)=>a+(h.tees[id]||0),0);
    const diff=Math.abs(total-target);
    if(diff<bestDiff){bestDiff=diff;best={id,total,diff};}
  });
  return best;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function computeStats(rounds){
  if(!rounds?.length)return null;
  const n=rounds.length;
  const avgScore=rounds.reduce((a,r)=>a+r.score,0)/n;
  const avgPutts=rounds.reduce((a,r)=>a+(r.holes?.reduce((b,h)=>b+(h.putts||0),0)||0),0)/n;
  const firTotal=rounds.reduce((a,r)=>a+(r.holes?.filter(h=>h.fir).length||0),0);
  const girTotal=rounds.reduce((a,r)=>a+(r.holes?.filter(h=>h.gir).length||0),0);
  const firPct=(firTotal/(n*14))*100;
  const girPct=(girTotal/(n*18))*100;
  let scrOpp=0,scrSave=0,threePutts=0,totalH=0;
  rounds.forEach(r=>r.holes?.forEach(h=>{totalH++;if(!h.gir){scrOpp++;if(h.score<=h.par)scrSave++;}if((h.putts||0)>=3)threePutts++;}));
  const scrPct=scrOpp>0?(scrSave/scrOpp)*100:0;
  const threePuttPct=totalH>0?(threePutts/totalH)*100:0;
  let drives=[];
  rounds.forEach(r=>r.holes?.forEach(h=>h.shots?.forEach(s=>{if(s.club==="Driver"&&s.distYards)drives.push(s.distYards);})));
  const avgDrive=drives.length?Math.round(drives.reduce((a,b)=>a+b,0)/drives.length):0;
  const pb={3:{s:0,p:0,n:0},4:{s:0,p:0,n:0},5:{s:0,p:0,n:0}};
  let eagles=0,birdies=0,pars=0,bogeys=0,doubles=0,worse=0;
  rounds.forEach(r=>r.holes?.forEach(h=>{
    const par=h.par;
    if(pb[par]){pb[par].s+=h.score;pb[par].p+=par;pb[par].n++;}
    const d=h.score-par;
    if(d<=-2)eagles++;else if(d===-1)birdies++;else if(d===0)pars++;else if(d===1)bogeys++;else if(d===2)doubles++;else worse++;
  }));
  const sgOTT=+((firPct-62)/8+(avgDrive-235)/25).toFixed(2);
  const sgAPR=+((girPct-55)/10).toFixed(2);
  const sgARG=+((scrPct-38)/15).toFixed(2);
  const sgPutt=+((33-avgPutts)/1.5).toFixed(2);
  const sgTotal=+(sgOTT+sgAPR+sgARG+sgPutt).toFixed(2);
  let dLeft=0,dCenter=0,dRight=0,dTotal=0;
  rounds.forEach(r=>r.holes?.forEach(h=>h.shots?.forEach(s=>{if(s.club==="Driver"){dTotal++;if(s.direction==="left")dLeft++;else if(s.direction==="right")dRight++;else dCenter++;}})));
  return{n,avgScore:+avgScore.toFixed(1),avgPutts:+avgPutts.toFixed(1),firPct:+firPct.toFixed(1),girPct:+girPct.toFixed(1),scrPct:+scrPct.toFixed(1),threePuttPct:+threePuttPct.toFixed(1),avgDrive,pb,eagles,birdies,pars,bogeys,doubles,worse,sgOTT,sgAPR,sgARG,sgPutt,sgTotal,driverMiss:{left:dTotal?Math.round(dLeft/dTotal*100):0,center:dTotal?Math.round(dCenter/dTotal*100):0,right:dTotal?Math.round(dRight/dTotal*100):0},scoreTrend:rounds.slice().reverse().map(r=>({course:r.course,score:r.score,par:r.par}))};
}

function clubStatsFor(rounds,clubName){
  if(!rounds?.length)return null;
  const shots=[];
  rounds.forEach(r=>r.holes?.forEach(h=>h.shots?.forEach(s=>{if(s.club===clubName)shots.push(s);})));
  if(!shots.length)return null;
  // Exclude penalty shots from distance metrics only
  const wd=shots.filter(s=>s.distYards>0&&!s.penalty);
  const avg=wd.length?Math.round(wd.reduce((a,s)=>a+s.distYards,0)/wd.length):null;
  const sorted=wd.map(s=>s.distYards).sort((a,b)=>a-b);
  const p90=sorted.length?Math.round(sorted[Math.floor(sorted.length*0.9)]):null;
  // Miss direction includes penalty shots (OB still tells you about tendency)
  const wDir=shots.filter(s=>s.direction);
  const left=wDir.length?Math.round(wDir.filter(s=>s.direction==="left").length/wDir.length*100):null;
  const right=wDir.length?Math.round(wDir.filter(s=>s.direction==="right").length/wDir.length*100):null;
  const center=wDir.length?Math.round(wDir.filter(s=>s.direction==="center").length/wDir.length*100):null;
  return{shots:shots.length,distShots:wd.length,avg,p90,left,right,center,allShots:shots};
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SGBar({label,value,max=2}){
  const pct=Math.min(Math.abs(value)/max,1)*50,color=sgColor(value);
  return(<div style={{marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#e8dcc8"}}>{label}</span><span style={{fontSize:13,fontWeight:700,color}}>{sgLabel(value)}</span></div>
    <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,position:"relative"}}>
      <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"rgba(255,255,255,0.15)"}}/>
      {value>=0?<div style={{position:"absolute",left:"50%",top:0,height:"100%",width:`${pct}%`,background:color,borderRadius:"0 3px 3px 0"}}/>:<div style={{position:"absolute",right:"50%",top:0,height:"100%",width:`${pct}%`,background:color,borderRadius:"3px 0 0 3px"}}/>}
    </div>
  </div>);
}
function StatCard({label,value,sub,color="#c8a96e",size=32}){
  return(<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px"}}>
    <div style={{fontSize:9,letterSpacing:2,color:"#6b7280",textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:size,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:"#6b7280",marginTop:4}}>{sub}</div>}
  </div>);
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App(){
  // Navigation
  const [screen,    setScreen]    = useState("profiles");
  const [profTab,   setProfTab]   = useState("overview");
  const [statsWin,  setStatsWin]  = useState("all"); // "all" | "10" | "5"

  // Profiles
  const [profiles,  setProfiles]  = useState([DUMMY_PROFILE]);
  const [pIdx,      setPIdx]      = useState(0);
  const [showNew,   setShowNew]   = useState(false);
  const [newName,   setNewName]   = useState("");
  const [newHdcp,   setNewHdcp]   = useState("");
  const [editClub,  setEditClub]  = useState(null);
  const [expRound,  setExpRound]  = useState(null);
  const [clubDrill, setClubDrill] = useState(null); // club name being drilled into in analytics

  // Course / tee selection
  const [query,     setQuery]     = useState("");
  const [selCourse, setSelCourse] = useState(null);
  const [selTeeId,  setSelTeeId]  = useState(null);

  // Round
  const [holeIdx,   setHoleIdx]   = useState(0);
  const [holes,     setHoles]     = useState(()=>Array(18).fill(null).map(()=>blankHole()));
  const [holePick,  setHolePick]  = useState(false);
  const [expHole,   setExpHole]   = useState(null);
  const [showYards, setShowYards] = useState(false);
  const [editShot,  setEditShot]  = useState(null);

  // Shot machine
  const [ss,        setSS]        = useState(SS.IDLE);
  const [selClub,   setSelClub]   = useState(null);
  const [origin,    setOrigin]    = useState(null);
  const [pendDist,  setPendDist]  = useState(null);
  const [selLie,    setSelLie]    = useState(null);
  const [selDir,    setSelDir]    = useState(null);
  const [penalty,   setPenalty]   = useState(false);

  // GPS / wind
  const [gps,       setGps]       = useState(null);
  const [gpsErr,    setGpsErr]    = useState(null);
  const [tracking,  setTracking]  = useState(false);
  const [wind,      setWind]      = useState(null);
  const [windLoad,  setWindLoad]  = useState(false);

  // UI
  const [msg,       setMsg]       = useState("Ready to carry your bag, boss. 🏌️");
  const [toast,     setToast]     = useState(null);

  const watchRef = useRef(null);
  const simPos   = useRef({lat:37.3382,lon:-121.8863});

  const prof  = profiles[pIdx];
  const statsRounds = useMemo(()=>{
    const r = prof?.rounds||[];
    if(statsWin==="5")  return r.slice(0,5);
    if(statsWin==="10") return r.slice(0,10);
    return r;
  },[prof?.rounds, statsWin]);
  const stats = useMemo(()=>computeStats(statsRounds),[statsRounds]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast=(m,e="✅")=>{setToast({m,e});setTimeout(()=>setToast(null),2600);};

  // ── GPS ────────────────────────────────────────────────────────────────────
  const startGps=useCallback(()=>{
    if(!navigator.geolocation){setGpsErr("sim");setGps({...simPos.current,sim:true});setTracking(true);return;}
    setTracking(true);
    watchRef.current=navigator.geolocation.watchPosition(
      p=>{setGpsErr(null);setGps({lat:p.coords.latitude,lon:p.coords.longitude,acc:Math.round(p.coords.accuracy)});},
      ()=>{setGpsErr("sim");setGps({...simPos.current,sim:true});},
      {enableHighAccuracy:true,maximumAge:0,timeout:30000}
    );
  },[]);
  const stopGps=useCallback(()=>{if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);setTracking(false);},[]);
  useEffect(()=>()=>stopGps(),[stopGps]);

  // ── Wind ───────────────────────────────────────────────────────────────────
  const fetchWind=useCallback(async(lat,lon)=>{
    setWindLoad(true);
    try{
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&forecast_days=1`);
      const d=await r.json();
      const s=Math.round(d.current.wind_speed_10m),deg=Math.round(d.current.wind_direction_10m);
      setWind({s,deg,d:wDir(deg)});
    }catch{
      const s=Math.round(Math.random()*15+3),deg=Math.round(Math.random()*360);
      setWind({s,deg,d:wDir(deg),sim:true});
    }finally{setWindLoad(false);}
  },[]);
 useEffect(()=>{if(gps&&screen==="round")fetchWind(gps?.lat,gps?.lon);},[gps,screen,fetchWind]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const hd = holes[holeIdx] || blankHole();
  const played    = holes.filter(h=>h.shots.length>0||h.putts>0);
  const totSc     = played.reduce((a,h)=>a+finalScore(h),0);
  const totPar    = played.reduce((a,h)=>a+h.par,0);
  const roundDiff = totSc-totPar;

  // Green & hazard distances — computed from shots taken this hole
  const courseHole       = selCourse?.holes?.[holeIdx] || null;
  const teeYards         = courseHole?.tees?.[selTeeId] || hd.yards || 0;
  const shotsTraveled    = hd.shots.reduce((a,s)=>a+(s.distYards||0),0);
  const remainCenter     = Math.max(0, teeYards - shotsTraveled);
  const remainFront      = Math.max(0, remainCenter - (courseHole?.green?.front ?? 12));
  const remainBack       = remainCenter + (courseHole?.green?.back ?? 22);
  const hazardsAhead     = (courseHole?.hazards||[])
    .map(h=>({...h, toFront:Math.max(0,h.front-shotsTraveled), toCarry:Math.max(0,h.carry-shotsTraveled)}))
    .filter(h=>h.toFront>0);

  // ── Profile helpers ────────────────────────────────────────────────────────
  const updProf = fn=>setProfiles(p=>{const n=[...p];n[pIdx]=fn(n[pIdx]);return n;});

  const addProfile=()=>{
    if(!newName.trim())return;
    const np={id:`p${Date.now()}`,name:newName.trim(),handicap:parseFloat(newHdcp)||null,clubs:DEFAULT_CLUBS.map(c=>({...c})),rounds:[]};
    setProfiles(p=>[...p,np]);setPIdx(profiles.length);setShowNew(false);setNewName("");setNewHdcp("");
    showToast(`Welcome, ${newName.trim()}! 🏌️`);
  };
  const delProfile=()=>{
    if(profiles.length<=1){showToast("Can't delete last profile","⚠️");return;}
    setProfiles(p=>p.filter((_,i)=>i!==pIdx));setPIdx(0);setScreen("profiles");
  };
  const saveRound=()=>{
    if(!played.length){showToast("No holes played","⚠️");return;}
    const rec={id:`r${Date.now()}`,date:new Date().toISOString().slice(0,10),course:selCourse?.name||"Unknown",tees:TEE_META[selTeeId]?.label||"",score:totSc,par:totPar,
      holes:holes.map(h=>({par:h.par,score:finalScore(h),putts:h.putts,fir:h.shots.some(s=>s.lie==="fairway"&&s.club==="Driver"),gir:h.shots.some(s=>s.lie==="green"),shots:h.shots}))};
    updProf(p=>({...p,rounds:[rec,...p.rounds]}));
    showToast("Round saved ⛳");setScreen("profile");setProfTab("rounds");
  };

  // ── Course helpers ─────────────────────────────────────────────────────────
  const [apiCourses, setApiCourses] = useState([]);
const [apiLoading, setApiLoading] = useState(false);

useEffect(()=>{
  if(query.trim().length < 2){ setApiCourses([]); return; }
  const timeout = setTimeout(async ()=>{
    setApiLoading(true);
    try {
      const res = await fetch(`/api/search-courses?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setApiCourses(data.courses || []);
    } catch(e){ setApiCourses([]); }
    setApiLoading(false);
  }, 400);
  return ()=>clearTimeout(timeout);
},[query]);

const filtered = query.trim().length < 2 ? COURSES : [
  ...COURSES.filter(c=>{
    const q=query.toLowerCase();
    return c.name.toLowerCase().includes(q)||c.city.toLowerCase().includes(q)||c.state.toLowerCase().includes(q);
  }),
...apiCourses
  .filter(a=>!COURSES.find(c=>c.name.toLowerCase()===a.club_name.toLowerCase()))
  .filter(a=>a.tees?.male?.length>0)
  .filter(a=>a.tees.male[0]?.holes?.length===18)
  .filter(a=>a.location?.city && a.location?.state)
  .map(a=>{
    const maleTees = a.tees.male || [];
    const primaryTee = maleTees[0];
    return {
      id: String(a.id),
      name: a.club_name,
      city: a.location.city,
      state: a.location.state,
      fromAPI: true,
      holes: (primaryTee?.holes || []).map((h,i)=>({
        par: h.par,
        hdcp: h.handicap || i+1,
        tees: Object.fromEntries(
          maleTees
            .filter(t=>t.holes?.[i]?.yardage)
            .map(t=>[t.tee_name.toLowerCase().replace(/[^a-z]/g,''), t.holes[i].yardage])
        ),
        green:{front:12,back:22},
        hazards:[]
      }))
    };
  })
];
  const availTees = selCourse ? Object.keys(TEE_META).filter(id=>selCourse.holes[0].tees[id]!=null) : [];

  const holesFromCourse=(course,teeId)=>course.holes.map(h=>blankHole(h.par,h.tees[teeId]||0,h.hdcp));

  const startRound=()=>{
    startGps();
    setHoles(holesFromCourse(selCourse,selTeeId));
    setHoleIdx(0);resetShot();
    setScreen("round");setMsg(`On the tee at ${selCourse.name}. Let's go! 🏌️`);
  };

  // ── Shot helpers ───────────────────────────────────────────────────────────
  const resetShot=()=>{setOrigin(null);setSelClub(null);setSelLie(null);setSelDir(null);setPenalty(false);setPendDist(null);setSS(SS.IDLE);};
  const updH=fn=>setHoles(p=>{const n=[...p];n[holeIdx]=fn(n[holeIdx]);return n;});
  const simP=(drift=false)=>{
    const p=simPos.current;
    if(!drift)return{lat:p.lat,lon:p.lon,sim:true};
    const m=(80+Math.random()*220)*0.9144,a=Math.random()*2*Math.PI;
    const lat=p.lat+(m*Math.cos(a))/111320,lon=p.lon+(m*Math.sin(a))/(111320*Math.cos(p.lat*Math.PI/180));
    simPos.current={lat,lon};return{lat,lon,sim:true};
  };
  const goNext=()=>{resetShot();if(holeIdx<17){setHoleIdx(h=>h+1);setMsg("New hole! 🏌️");}else setScreen("scorecard_view");};
  const goHole=n=>{setHoleIdx(n-1);resetShot();setMsg(`Hole ${n} — let's go! 🏌️`);setHolePick(false);};

  const onClubConfirm=()=>{
    if(!selClub)return;
    if(selClub==="Putter"){setSS(SS.PUTT);setMsg("Read the break. How many putts? 🏌️");return;}
    const o=(gps&&!gps.sim)?gps:simP(false);
    setOrigin(o);setSS(SS.READY);
    setMsg(`${wind?`Wind ${wind.s}mph ${wind.d}. `:""}${selClub} — tap SWING.`);
  };
  const onSwing=()=>{setSS(SS.FLIGHT);setMsg("Walk to your ball. 🚶");showToast("Origin locked","🏌️");if(gps)fetchWind(gps.lat,gps.lon);};
  const onMark=()=>{
    const l=(gps&&!gps.sim)?gps:simP(true);
    const d=origin?calcDist(origin.lat,origin.lon,l.lat,l.lon):null;
    setPendDist(d);simPos.current={lat:l.lat,lon:l.lon};
    setSelLie(null);setSelDir(null);setPenalty(false);setSS(SS.LAND);
  };
  const onLie=lie=>{setSelLie(lie.id);setPenalty(!!lie.penalty);};
  const onConfirmLand=()=>{
    if(!selLie)return;
    const shot={id:Date.now(),club:selClub,distYards:pendDist,lie:selLie,direction:selDir,penalty,wind:wind?{...wind}:null};
    if(selLie==="green"){
      updH(h=>({...h,shots:[...h.shots,shot]}));
      setMsg("On the green — select Putter when ready. ⛳");
      showToast("On the green!","⛳");
      resetShot();
    }else{
      updH(h=>({...h,shots:[...h.shots,shot]}));
      const tips={Driver:["Tee it high 🚀","Load that back foot."],Putter:["Read the break.","Smooth tempo."],default:["Commit to the shot.","One thought max."]};
      const pool=tips[selClub]||tips.default;
      setMsg(`${pendDist?pendDist+" yds. ":""}${pool[Math.floor(Math.random()*pool.length)]}`);
      showToast(pendDist?`${selClub} — ${pendDist} yds`:"Shot logged","📍");resetShot();
    }
  };
  const onPutts=n=>{
    updH(h=>({...h,putts:n}));
    const sc=hd.shots.length+n+(hd.shots.some(s=>s.penalty)?1:0)+hd.scoreAdj;
    const d=sc-hd.par;
    showToast(`${n} putt${n!==1?"s":""} · Score ${sc} (${d===0?"E":d>0?"+"+d:d})`,"⛳");
    resetShot();
    setTimeout(()=>{if(holeIdx<17){setHoleIdx(h=>h+1);setMsg("New hole! 🏌️");}else setScreen("scorecard_view");},1400);
  };
  const adjSc=d=>updH(h=>({...h,scoreAdj:h.scoreAdj+d}));
  const undoLast=()=>{updH(h=>({...h,shots:h.shots.slice(0,-1)}));showToast("Shot removed","↩️");};
  const delShot=(hi,id)=>setHoles(p=>{const n=[...p];n[hi]={...n[hi],shots:n[hi].shots.filter(s=>s.id!==id)};return n;});
  const adjPutts=(hi,d)=>setHoles(p=>{const n=[...p];n[hi]={...n[hi],putts:Math.max(0,n[hi].putts+d)};return n;});
  const adjScHole=(hi,d)=>setHoles(p=>{const n=[...p];n[hi]={...n[hi],scoreAdj:n[hi].scoreAdj+d};return n;});
  const openEditShot=sh=>setEditShot({holeIdx,shotId:sh.id,club:sh.club,lie:sh.lie,direction:sh.direction,penalty:sh.penalty,distYards:sh.distYards?.toString()||""});
  const saveEditShot=()=>{
    if(!editShot)return;
    const{holeIdx:hi,shotId,club,lie,direction,penalty:pen,distYards}=editShot;
    setHoles(p=>{const n=[...p];n[hi]={...n[hi],shots:n[hi].shots.map(s=>s.id===shotId?{...s,club,lie,direction,penalty:pen,distYards:distYards?parseInt(distYards)||null:null}:s)};return n;});
    setEditShot(null);showToast("Shot updated","✏️");
  };

  // Shorthand styles

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return(
    <div style={S.root}>
      <style>{css}</style>
      {toast&&<div style={S.toast}>{toast.e} {toast.m}</div>}

      {/* ════ PROFILES ════════════════════════════════════════════════════ */}
      {screen==="profiles"&&(
        <div style={S.page}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"40px 24px 24px"}}>
            <div style={{fontSize:48,filter:"drop-shadow(0 0 16px #4ade8060)"}}>⛳</div>
            <h1 style={S.logoTitle}>GAMETIME GOLF</h1>
            <p style={S.logoSub}>Your Game. Your Stats. Your Time.</p>
          </div>
          <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
            <div style={S.lbl}>SELECT PROFILE</div>
            {profiles.map((p,i)=>(
              <button key={p.id} style={{...S.card,display:"flex",alignItems:"center",gap:14,padding:16,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.03)"}}
                onClick={()=>{setPIdx(i);setScreen("profile");setProfTab("overview");}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#c8a96e,#a07840)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#0e1117",flexShrink:0}}>{p.name.charAt(0)}</div>
                <div style={{flex:1,textAlign:"left"}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#e8dcc8"}}>{p.name}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{p.handicap!=null?`Hdcp ${p.handicap} · `:""}{p.rounds.length} rounds</div>
                </div>
                <span style={{color:"#6b7280",fontSize:18}}>›</span>
              </button>
            ))}
            <button style={S.btn} onClick={()=>setShowNew(true)}>+ New Profile</button>
          </div>
        </div>
      )}

      {/* ════ PROFILE ═════════════════════════════════════════════════════ */}
      {screen==="profile"&&(
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 0"}}>
            <button style={S.iconBtn} onClick={()=>setScreen("profiles")}>←</button>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:"#c8a96e",letterSpacing:2}}>GAMETIME GOLF</div>
            <div style={{width:36}}/>
          </div>
          <div style={{margin:"12px 20px",background:"linear-gradient(135deg,rgba(200,169,110,0.12),rgba(200,169,110,0.04))",border:"1px solid rgba(200,169,110,0.25)",borderRadius:18,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#c8a96e,#a07840)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#0e1117",flexShrink:0}}>{prof.name.charAt(0)}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:700,color:"#e8dcc8"}}>{prof.name}</div>
              <div style={{fontSize:12,color:"#c8a96e",marginTop:1}}>{prof.handicap!=null?`Handicap ${prof.handicap}`:""}</div>
            </div>
            <button style={{...S.btn,width:"auto",padding:"10px 16px",fontSize:13}} onClick={()=>setScreen("course_select")}>⛳ New Round</button>
          </div>
          <div style={S.tabBar}>
            {[["overview","🏠","Overview"],["rounds","📋","Rounds"],["analytics","📊","Stats"],["bag","🏌️","Bag"],["settings","⚙️","Settings"]].map(([t,icon,label])=>(
              <button key={t} style={{...S.tab,borderBottom:`2px solid ${profTab===t?"#c8a96e":"transparent"}`,color:profTab===t?"#c8a96e":"#6b7280"}} onClick={()=>setProfTab(t)}>
                <span style={{fontSize:13}}>{icon}</span>
                <span style={{fontSize:8,letterSpacing:1,textTransform:"uppercase",marginTop:1}}>{label}</span>
              </button>
            ))}
          </div>
          <div style={{padding:"16px 20px 80px",flex:1,overflowY:"auto"}}>

            {/* OVERVIEW */}
            {profTab==="overview"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {stats?(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <StatCard label="Scoring Avg" value={stats.avgScore} sub={`${stats.n} rounds`}/>
                      <StatCard label="Avg Putts" value={stats.avgPutts} sub="per round"/>
                      <StatCard label="Fairways Hit" value={`${stats.firPct}%`}/>
                      <StatCard label="Greens in Reg" value={`${stats.girPct}%`}/>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                      <div style={{...S.lbl,marginBottom:10}}>STROKES GAINED</div>
                      <SGBar label="Off the Tee" value={stats.sgOTT}/><SGBar label="Approach" value={stats.sgAPR}/><SGBar label="Around Green" value={stats.sgARG}/><SGBar label="Putting" value={stats.sgPutt}/>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                      <div style={{...S.lbl,marginBottom:10}}>SCORE TREND</div>
                      <div style={{display:"flex",gap:5,alignItems:"flex-end",height:60}}>
                        {stats.scoreTrend.map((r,i)=>{const d=r.score-r.par;const h=Math.min(60,Math.max(16,60-(d*7)));const c=d<=0?"#4ade80":d<=3?"#fbbf24":"#f87171";const label=r.course.split(" ")[0];return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><div style={{fontSize:8,color:c,fontWeight:700}}>{d>0?"+"+d:d}</div><div style={{width:"100%",height:h,background:c+"33",border:`1px solid ${c}`,borderRadius:3}}/><div style={{fontSize:7,color:"#4b5563",textAlign:"center",overflow:"hidden",whiteSpace:"nowrap",maxWidth:"100%"}}>{label}</div></div>);})}
                      </div>
                    </div>
                    <button style={S.btn} onClick={()=>setScreen("course_select")}>⛳ Start New Round</button>
                  </>
                ):(
                  <div style={{textAlign:"center",padding:"40px 0"}}>
                    <div style={{fontSize:40,marginBottom:12}}>⛳</div>
                    <div style={{fontSize:15,color:"#e8dcc8",fontWeight:600,marginBottom:8}}>No rounds yet</div>
                    <div style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Start tracking to see your stats.</div>
                    <button style={S.btn} onClick={()=>setScreen("course_select")}>Start First Round 🚀</button>
                  </div>
                )}
              </div>
            )}

            {/* ROUNDS */}
            {profTab==="rounds"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button style={S.btn} onClick={()=>setScreen("course_select")}>⛳ New Round</button>
                {prof.rounds.length===0&&<div style={{fontSize:14,color:"#6b7280",textAlign:"center",padding:30}}>No rounds yet.</div>}
                {prof.rounds.map(r=>{
                  const d=r.score-r.par;const isExp=expRound===r.id;
                  const firCount=r.holes?.filter(h=>h.fir).length||0;
                  const girCount=r.holes?.filter(h=>h.gir).length||0;
                  const puttCount=r.holes?.reduce((a,h)=>a+(h.putts||0),0)||0;
                  return(<div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
                    <button style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",cursor:"pointer",textAlign:"left"}} onClick={()=>setExpRound(isExp?null:r.id)}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div><div style={{fontSize:14,fontWeight:700,color:"#e8dcc8"}}>{r.course}</div><div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{r.date} · {r.tees} Tees</div></div>
                        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:scColor(r.score,r.par),lineHeight:1}}>{r.score}</div><div style={{fontSize:11,color:scColor(r.score,r.par)}}>{d===0?"E":d>0?`+${d}`:d}</div></div>
                      </div>
                      <div style={{display:"flex",gap:16,marginTop:8}}>
                        {[["FIR",`${firCount}/14`],["GIR",`${girCount}/18`],["Putts",puttCount]].map(([l,v])=>(
                          <div key={l}><div style={{fontSize:9,color:"#6b7280",letterSpacing:1}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:"#c8a96e"}}>{v}</div></div>
                        ))}
                      </div>
                    </button>
                    {isExp&&(<div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                      {r.holes?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{r.holes.map((h,hi)=>{const c=scColor(h.score,h.par);return(<div key={hi} style={{width:28,height:28,borderRadius:5,background:c+"22",border:`1px solid ${c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:c}}>{h.score}</div>);})}</div>}
                      <div style={{display:"flex",gap:6}}>
                        {[{l:"🦅",v:r.holes?.filter(h=>h.score-h.par<=-2).length||0,c:"#f59e0b"},{l:"🐦",v:r.holes?.filter(h=>h.score-h.par===-1).length||0,c:"#4ade80"},{l:"—",v:r.holes?.filter(h=>h.score-h.par===0).length||0,c:"#e8dcc8"},{l:"+1",v:r.holes?.filter(h=>h.score-h.par===1).length||0,c:"#fb923c"},{l:"+2+",v:r.holes?.filter(h=>h.score-h.par>=2).length||0,c:"#f87171"}].map(({l,v,c})=>(
                          <div key={l} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 0"}}><div style={{fontSize:12,color:c,fontWeight:700}}>{v}</div><div style={{fontSize:9,color:"#6b7280"}}>{l}</div></div>
                        ))}
                      </div>
                      <button style={{...S.ghost,color:"#f87171",borderColor:"rgba(248,113,113,0.25)"}} onClick={()=>updProf(p=>({...p,rounds:p.rounds.filter(x=>x.id!==r.id)}))}>Delete Round 🗑️</button>
                    </div>)}
                  </div>);
                })}
              </div>
            )}

            {/* ANALYTICS */}
            {profTab==="analytics"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* Window toggle */}
                <div style={{display:"flex",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}>
                  {[["all","All Time"],["10","Last 10"],["5","Last 5"]].map(([val,label])=>(
                    <button key={val} style={{flex:1,padding:"8px 0",fontSize:12,fontWeight:600,borderRadius:9,border:"none",cursor:"pointer",background:statsWin===val?"#c8a96e":"transparent",color:statsWin===val?"#0e1117":"#6b7280",transition:"all 0.15s"}} onClick={()=>setStatsWin(val)}>{label}</button>
                  ))}
                </div>
                {statsWin!=="all"&&prof.rounds.length>0&&<div style={{fontSize:11,color:"#4b5563",textAlign:"center",marginTop:-8}}>Based on {Math.min(parseInt(statsWin),prof.rounds.length)} of {prof.rounds.length} rounds</div>}
                {!stats&&<div style={{fontSize:14,color:"#6b7280",textAlign:"center",padding:30}}>No rounds yet.</div>}
                {stats&&(<>
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                    <div style={{...S.lbl,marginBottom:4}}>STROKES GAINED</div>
                    <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>vs ~15 handicap baseline. Positive = better.</div>
                    <SGBar label="Off the Tee" value={stats.sgOTT}/><SGBar label="Approach" value={stats.sgAPR}/><SGBar label="Around Green" value={stats.sgARG}/><SGBar label="Putting" value={stats.sgPutt}/>
                    <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:10,paddingTop:10}}><SGBar label="Total SG" value={stats.sgTotal} max={4}/></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <StatCard label="FIR %" value={`${stats.firPct}%`} color={stats.firPct>60?"#4ade80":"#fb923c"} size={28} sub="Tour avg ~60%"/>
                    <StatCard label="GIR %" value={`${stats.girPct}%`} color={stats.girPct>50?"#4ade80":"#fb923c"} size={28} sub="Tour avg ~65%"/>
                    <StatCard label="Scrambling" value={`${stats.scrPct}%`} color={stats.scrPct>45?"#4ade80":"#fb923c"} size={28}/>
                    <StatCard label="3-Putt Rate" value={`${stats.threePuttPct}%`} color={stats.threePuttPct>10?"#f87171":"#4ade80"} size={28}/>
                    <StatCard label="Avg Drive" value={`${stats.avgDrive}y`} size={28}/>
                    <StatCard label="Avg Putts" value={stats.avgPutts} size={28} sub="per round"/>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                    <div style={{...S.lbl,marginBottom:10}}>SCORING DISTRIBUTION</div>
                    <div style={{display:"flex",gap:6}}>
                      {[{l:"Eagle",v:stats.eagles,c:"#f59e0b",e:"🦅"},{l:"Birdie",v:stats.birdies,c:"#4ade80",e:"🐦"},{l:"Par",v:stats.pars,c:"#e8dcc8",e:"—"},{l:"Bogey",v:stats.bogeys,c:"#fb923c",e:"+1"},{l:"Dbl+",v:stats.doubles+stats.worse,c:"#f87171",e:"+2"}].map(({l,v,c,e})=>(
                        <div key={l} style={{flex:1,textAlign:"center",background:c+"12",border:`1px solid ${c}33`,borderRadius:10,padding:"8px 0"}}>
                          <div style={{fontSize:14}}>{e}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:c,lineHeight:1.1}}>{v}</div><div style={{fontSize:8,color:"#6b7280"}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                    <div style={{...S.lbl,marginBottom:10}}>SCORING BY PAR</div>
                    {[3,4,5].map(p=>{const b=stats.pb[p];const avg=b.n>0?(b.s/b.n).toFixed(2):"-";const rel=b.n>0?((b.s-b.p)/b.n).toFixed(2):"-";const col=parseFloat(rel)>0?"#fb923c":parseFloat(rel)<0?"#4ade80":"#c8a96e";return(<div key={p} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><div><div style={{fontSize:14,fontWeight:600,color:"#e8dcc8"}}>Par {p}s</div><div style={{fontSize:11,color:"#6b7280"}}>{b.n} holes</div></div><div style={{textAlign:"right"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"#c8a96e",lineHeight:1}}>{avg}</div><div style={{fontSize:11,color:col}}>{parseFloat(rel)>0?`+${rel}`:rel} vs par</div></div></div>);})}
                  </div>
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:14}}>
                    <div style={{...S.lbl,marginBottom:10}}>DRIVER MISS PATTERN</div>
                    <div style={{display:"flex",gap:8}}>
                      {[{l:"Left",v:stats.driverMiss.left,c:"#3b82f6"},{l:"Center",v:stats.driverMiss.center,c:"#4ade80"},{l:"Right",v:stats.driverMiss.right,c:"#f87171"}].map(({l,v,c})=>(
                        <div key={l} style={{flex:1,textAlign:"center",background:c+"12",border:`1px solid ${c}33`,borderRadius:10,padding:"12px 0"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:c,lineHeight:1}}>{v}%</div><div style={{fontSize:11,color:"#6b7280",marginTop:4}}>{l}</div></div>
                      ))}
                    </div>
                  </div>

                  {/* ── Club Analytics ── */}
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
                    <div style={{padding:"14px 14px 10px"}}><div style={{...S.lbl}}>CLUB ANALYTICS</div><div style={{fontSize:11,color:"#4b5563",marginTop:4}}>Tap a club to view and manage shots used in calculations.</div></div>
                    {CLUBS.filter(c=>c!=="Putter").map(clubName=>{
                      const cs=clubStatsFor(statsRounds,clubName);
                      const isOpen=clubDrill===clubName;
                      const hasData=cs&&cs.shots>0;
                      return(
                        <div key={clubName} style={{borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                          {/* Club row — tap to expand */}
                          <button onClick={()=>hasData&&setClubDrill(isOpen?null:clubName)} style={{width:"100%",background:"transparent",border:"none",padding:"12px 14px",cursor:hasData?"pointer":"default",textAlign:"left"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:600,color:hasData?"#e8dcc8":"#4b5563"}}>{clubName}</div>
                                <div style={{display:"flex",gap:12,marginTop:4}}>
                                  {hasData?(
                                    <>
                                      {cs.avg&&<span style={{fontSize:11,color:"#c8a96e"}}>Avg {cs.avg}y</span>}
                                      {cs.p90&&<span style={{fontSize:11,color:"#4ade80"}}>P90 {cs.p90}y</span>}
                                      {cs.left!==null&&<span style={{fontSize:11,color:"#6b7280"}}>L{cs.left}% · C{cs.center}% · R{cs.right}%</span>}
                                    </>
                                  ):(
                                    <span style={{fontSize:11,color:"#374151"}}>No shots recorded yet</span>
                                  )}
                                </div>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                {hasData?(
                                  <>
                                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"3px 10px",fontSize:12,color:"#9ca3af"}}>
                                      {cs.distShots}<span style={{fontSize:10,color:"#4b5563"}}> shots</span>
                                    </div>
                                    <span style={{color:"#6b7280",fontSize:14,transform:isOpen?"rotate(90deg)":"none",display:"inline-block",transition:"transform 0.15s"}}>›</span>
                                  </>
                                ):(
                                  <span style={{fontSize:11,color:"#2d3748"}}>—</span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Drill-down shot list */}
                          {isOpen&&(
                            <div style={{background:"rgba(0,0,0,0.2)",padding:"8px 14px 12px"}}>
                              <div style={{fontSize:10,color:"#4b5563",marginBottom:8}}>
                                {cs.allShots.length - cs.distShots > 0 && `${cs.allShots.length - cs.distShots} penalty shot${cs.allShots.length - cs.distShots>1?"s":""} excluded from distance calc · `}
                                {cs.allShots.length} total shots
                              </div>
                              {cs.allShots.length===0&&<div style={{fontSize:12,color:"#4b5563"}}>No shots recorded.</div>}
                              {cs.allShots.map((sh,si)=>{
                                const lie=LIES.find(l=>l.id===sh.lie);
                                const isPenalty=sh.penalty;
                                return(
                                  <div key={sh.id||si} style={{display:"flex",alignItems:"center",gap:8,background:isPenalty?"rgba(248,113,113,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${isPenalty?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.05)"}`,borderRadius:10,padding:"8px 10px",marginBottom:6}}>
                                    <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(200,169,110,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#c8a96e",fontWeight:700,flexShrink:0}}>{si+1}</div>
                                    <div style={{flex:1}}>
                                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                        <span style={{fontSize:12,color:"#e8dcc8",fontWeight:600}}>{sh.distYards?`${sh.distYards}y`:"—"}</span>
                                        {isPenalty&&<span style={{fontSize:10,color:"#f87171",background:"rgba(248,113,113,0.15)",borderRadius:4,padding:"1px 5px"}}>⚠️ penalty</span>}
                                      </div>
                                      <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>
                                        {lie?.emoji} {lie?.label}{sh.direction?` · ${sh.direction}`:""}
                                      </div>
                                    </div>
                                    <button
                                      onClick={()=>{
                                        // Match by id if present, otherwise by index within allShots
                                        let matchCount=0;
                                        updProf(p=>({...p,rounds:p.rounds.map(r=>({...r,holes:(r.holes||[]).map(h=>({...h,shots:(h.shots||[]).filter(s=>{
                                          // If shot has id, match on id
                                          if(sh.id&&s.id) return s.id!==sh.id;
                                          // Otherwise match on club+lie+distYards+direction combo, remove only first occurrence
                                          const matches=s.club===sh.club&&s.lie===sh.lie&&s.distYards===sh.distYards&&s.direction===sh.direction;
                                          if(matches&&matchCount===0){matchCount++;return false;}
                                          return true;
                                        })}))}))}));
                                        showToast("Shot removed from analytics","🗑️");
                                      }}
                                      style={{fontSize:11,color:"#f87171",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,padding:"3px 8px",cursor:"pointer",flexShrink:0}}>
                                      Delete
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Putter row */}
                    {(()=>{
                      const cs=clubStatsFor(statsRounds,"Putter");
                      if(!cs)return null;
                      return(<div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"12px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#e8dcc8"}}>Putter</div><div style={{fontSize:11,color:"#6b7280",marginTop:4}}>{cs.shots} recorded putts</div></div>
                        </div>
                      </div>);
                    })()}
                  </div>
                </>)}
              </div>
            )}

            {/* BAG */}
            {profTab==="bag"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:12,color:"#6b7280",marginBottom:4}}>Toggle clubs in/out. Tap name to rename.</div>
                {prof.clubs.map((c,i)=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.03)",border:`1px solid ${c.sel?"rgba(200,169,110,0.3)":"rgba(255,255,255,0.06)"}`,borderRadius:12,padding:"12px 14px"}}>
                    <button style={{width:24,height:24,borderRadius:"50%",background:c.sel?"#c8a96e":"rgba(255,255,255,0.06)",border:`2px solid ${c.sel?"#c8a96e":"rgba(255,255,255,0.15)"}`,cursor:"pointer",flexShrink:0,fontSize:12,color:c.sel?"#0e1117":"transparent"}}
                      onClick={()=>updProf(p=>{const cl=[...p.clubs];cl[i]={...cl[i],sel:!cl[i].sel};return{...p,clubs:cl};})}>✓</button>
                    {editClub?.idx===i
                      ?<input autoFocus style={{...S.input,flex:1,padding:"5px 8px",fontSize:14}} value={editClub.name} onChange={e=>setEditClub(ec=>({...ec,name:e.target.value}))}
                          onBlur={()=>{updProf(p=>{const cl=[...p.clubs];cl[i]={...cl[i],name:editClub.name};return{...p,clubs:cl};});setEditClub(null);showToast("Club renamed");}}
                          onKeyDown={e=>{if(e.key==="Enter"){updProf(p=>{const cl=[...p.clubs];cl[i]={...cl[i],name:editClub.name};return{...p,clubs:cl};});setEditClub(null);showToast("Club renamed");}}}/>
                      :<span style={{flex:1,fontSize:14,color:c.sel?"#e8dcc8":"#6b7280",fontWeight:c.sel?600:400,cursor:"pointer"}} onClick={()=>setEditClub({idx:i,name:c.name})}>{c.name}</span>
                    }
                    <span style={{fontSize:11,color:"#4b5563",cursor:"pointer"}} onClick={()=>setEditClub({idx:i,name:c.name})}>✏️</span>
                  </div>
                ))}
              </div>
            )}

            {/* SETTINGS */}
            {profTab==="settings"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>

                {/* Profile */}
                <div style={{...S.lbl,marginBottom:-4}}>PROFILE</div>
                <div><div style={S.lbl}>NAME</div><input style={S.input} defaultValue={prof.name} id="sname"/></div>
                <div><div style={S.lbl}>HANDICAP INDEX</div><input style={S.input} type="number" defaultValue={prof.handicap||""} placeholder="Optional" id="shdcp"/></div>
                <button style={S.btn} onClick={()=>{
                  const name=document.getElementById("sname").value.trim();
                  const handicap=parseFloat(document.getElementById("shdcp").value)||null;
                  if(name)updProf(p=>({...p,name,handicap}));
                  showToast("Profile saved");
                }}>Save Profile</button>

                {/* In-round club stats window */}
                <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:14}}>
                  <div style={{...S.lbl,marginBottom:4}}>IN-ROUND CLUB STATS</div>
                  <div style={{fontSize:12,color:"#4b5563",marginBottom:10}}>How many recent rounds to use when showing club averages during a round.</div>
                  <div style={{display:"flex",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}>
                    {[[5,"Last 5"],[10,"Last 10"],[999,"All Time"]].map(([val,label])=>{
                      const cur=prof.settings?.clubStatsWindow||10;
                      const active=cur===val;
                      return(<button key={val} style={{flex:1,padding:"9px 0",fontSize:12,fontWeight:600,borderRadius:9,border:"none",cursor:"pointer",background:active?"#c8a96e":"transparent",color:active?"#0e1117":"#6b7280"}}
                        onClick={()=>updProf(p=>({...p,settings:{...p.settings,clubStatsWindow:val}}))}>{label}</button>);
                    })}
                  </div>
                  {(()=>{const w=prof.settings?.clubStatsWindow||10;const n=Math.min(w,prof.rounds.length);return(<div style={{fontSize:11,color:"#4b5563",marginTop:6,textAlign:"center"}}>{n} round{n!==1?"s":""} in calculation · {prof.rounds.length} total saved</div>);})()}
                </div>

                {/* Preferred yardage */}
                <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:14}}>
                  <div style={{...S.lbl,marginBottom:4}}>PREFERRED YARDAGE</div>
                  <div style={{fontSize:12,color:"#4b5563",marginBottom:10}}>Your ideal course length on a standard par 72. GameTime Golf will recommend the right tees automatically.</div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <input style={{...S.input,flex:1}} type="number" defaultValue={prof.settings?.preferredYards||6500} placeholder="e.g. 6500" id="prefyards"/>
                    <span style={{fontSize:12,color:"#6b7280",whiteSpace:"nowrap"}}>yards</span>
                  </div>
                  {/* Show example recommendation across courses */}
                  <div style={{marginTop:10,background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.15)",borderRadius:12,padding:"10px 12px"}}>
                    <div style={{...S.lbl,marginBottom:6}}>EXAMPLE RECOMMENDATIONS</div>
                    {COURSES.slice(0,3).map(c=>{
                      const yards=parseInt(document.getElementById("prefyards")?.value)||prof.settings?.preferredYards||6500;
                      const rec=recommendTee(c,yards);
                      if(!rec)return null;
                      const tm=TEE_META[rec.id];
                      return(<div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{fontSize:12,color:"#9ca3af"}}>{c.name.split(" ")[0]}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:tm.hex,border:"1px solid rgba(255,255,255,0.2)"}}/>
                          <span style={{fontSize:12,color:tm.hex,fontWeight:600}}>{tm.label}</span>
                          <span style={{fontSize:11,color:"#4b5563"}}>{rec.total.toLocaleString()}y</span>
                        </div>
                      </div>);
                    })}
                  </div>
                  <button style={{...S.btn,marginTop:10}} onClick={()=>{
                    const yards=parseInt(document.getElementById("prefyards").value)||null;
                    if(yards&&yards>3000&&yards<9000)updProf(p=>({...p,settings:{...p.settings,preferredYards:yards}}));
                    showToast("Preferred yardage saved");
                  }}>Save Yardage</button>
                </div>

                {/* Danger zone */}
                <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:14}}>
                  <div style={{fontSize:11,color:"#f87171",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>DANGER ZONE</div>
                  <button style={{...S.ghost,color:"#f87171",borderColor:"rgba(248,113,113,0.25)"}} onClick={delProfile}>Delete Profile</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ COURSE SELECT ════════════════════════════════════════════════ */}
      {screen==="course_select"&&(
        <div style={S.page}>
          <div style={S.hdr}><button style={S.iconBtn} onClick={()=>setScreen("profile")}>←</button><span style={S.pgT}>SELECT COURSE</span><div style={{width:36}}/></div>
          <div style={{margin:"0 20px 12px",position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#6b7280",pointerEvents:"none"}}>🔍</span>
            <input style={S.searchInput} placeholder="Search course, city or state…" value={query} onChange={e=>setQuery(e.target.value)}/>
          </div>
          <div style={{margin:"0 20px 8px"}}><span style={S.lbl}>{query.trim().length>=2?`${filtered.length} RESULTS`:`${COURSES.length} COURSES`}</span></div>
          <div style={{margin:"0 20px",display:"flex",flexDirection:"column",gap:10,paddingBottom:40}}>
            {filtered.length===0&&<div style={{fontSize:13,color:"#6b7280",textAlign:"center",padding:"20px 0"}}>No courses match "{query}"</div>}
            {filtered.map(c=>{
              const tIds=Object.keys(TEE_META).filter(id=>c.holes[0].tees[id]!=null);
              return(<button key={c.id} style={{...S.card,textAlign:"left",border:`1px solid ${selCourse?.id===c.id?"#c8a96e":"rgba(255,255,255,0.07)"}`,background:selCourse?.id===c.id?"rgba(200,169,110,0.08)":"rgba(255,255,255,0.03)"}}
                onClick={()=>{setSelCourse(c);setSelTeeId(null);setScreen("tee_select");}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:14,fontWeight:700,color:"#e8dcc8",flex:1}}>{c.name}</div><span style={{fontSize:11,color:"#6b7280",marginLeft:8}}>18h</span></div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>{c.city}, {c.state}</div>
                <div style={{display:"flex",gap:5,marginTop:8}}>{tIds.map(id=><div key={id} style={{width:12,height:12,borderRadius:"50%",background:TEE_META[id].hex,border:"1px solid rgba(255,255,255,0.2)"}}/>)}</div>
              </button>);
            })}
          </div>
        </div>
      )}

      {/* ════ TEE SELECT ══════════════════════════════════════════════════ */}
      {screen==="tee_select"&&selCourse&&(
        <div style={S.page}>
          <div style={S.hdr}><button style={S.iconBtn} onClick={()=>setScreen("course_select")}>←</button><span style={S.pgT}>SELECT TEES</span><div style={{width:36}}/></div>
          <div style={{margin:"0 20px 14px"}}><div style={{fontSize:16,fontWeight:700,color:"#e8dcc8"}}>{selCourse.name}</div><div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{selCourse.city}, {selCourse.state}</div></div>
          <div style={{margin:"0 20px 14px",display:"flex",flexDirection:"column",gap:10}}>
            {(()=>{
              const rec=recommendTee(selCourse, prof.settings?.preferredYards||null);
              return availTees.map(id=>{
                const tm=TEE_META[id];
                const totalY=selCourse.holes.reduce((a,h)=>a+(h.tees[id]||0),0);
                const sel=selTeeId===id;
                const isRec=rec&&rec.id===id;
                return(<button key={id} style={{...S.card,textAlign:"left",border:`2px solid ${sel?tm.hex:isRec?"rgba(200,169,110,0.4)":"rgba(255,255,255,0.08)"}`,background:sel?tm.hex+"18":"rgba(255,255,255,0.03)"}} onClick={()=>setSelTeeId(id)}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:tm.hex,border:"2px solid rgba(255,255,255,0.2)",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontSize:15,fontWeight:700,color:sel?tm.hex:"#e8dcc8"}}>{tm.label} Tees</div>
                        {isRec&&<span style={{fontSize:9,letterSpacing:1,color:"#c8a96e",background:"rgba(200,169,110,0.15)",border:"1px solid rgba(200,169,110,0.3)",borderRadius:4,padding:"2px 6px",textTransform:"uppercase"}}>Recommended</span>}
                      </div>
                      <div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{totalY.toLocaleString()} yds</div>
                    </div>
                    {sel&&<span style={{fontSize:18,color:tm.hex}}>✓</span>}
                  </div>
                </button>);
              });
            })()}
          </div>
          {selTeeId&&(
            <div style={{margin:"0 20px 100px"}}>
              <div style={{...S.lbl,marginBottom:8}}>SCORECARD PREVIEW</div>
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"28px 50px 1fr 50px",padding:"7px 14px",background:"rgba(255,255,255,0.05)",fontSize:9,letterSpacing:2,color:"#6b7280",textTransform:"uppercase",gap:4}}><span>#</span><span>Par</span><span>Hdcp</span><span style={{textAlign:"right"}}>Yds</span></div>
                {selCourse.holes.map((h,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"28px 50px 1fr 50px",padding:"6px 14px",borderTop:"1px solid rgba(255,255,255,0.04)",fontSize:12,gap:4,background:i%2===0?"rgba(255,255,255,0.01)":"transparent"}}><span style={{color:"#6b7280",fontWeight:600}}>{i+1}</span><span style={{color:"#9ca3af"}}>Par {h.par}</span><span style={{color:"#4b5563"}}>{h.hdcp}</span><span style={{textAlign:"right",color:TEE_META[selTeeId].hex,fontWeight:700}}>{h.tees[selTeeId]||"—"}</span></div>))}
                <div style={{display:"grid",gridTemplateColumns:"28px 50px 1fr 50px",padding:"7px 14px",borderTop:"1px solid rgba(255,255,255,0.1)",fontSize:12,fontWeight:700,color:"#c8a96e",background:"rgba(200,169,110,0.05)",gap:4}}><span/><span>Total</span><span/><span style={{textAlign:"right"}}>{selCourse.holes.reduce((a,h)=>a+(h.tees[selTeeId]||0),0).toLocaleString()}</span></div>
              </div>
            </div>
          )}
          <div style={S.fixedBar}><button style={{...S.btn,opacity:selTeeId?1:0.35}} disabled={!selTeeId} onClick={startRound}>Tee It Up 🏌️</button></div>
        </div>
      )}

      {/* ════ ROUND ═══════════════════════════════════════════════════════ */}
      {screen==="round"&&(
        <div style={S.round}>
          {/* Header */}
          <div style={S.hdr}>
            <button style={S.iconBtn} onClick={()=>{stopGps();setScreen("profile");}}>←</button>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={S.lbl}>HOLE</span>
              <button onClick={()=>setHolePick(true)} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:"#c8a96e",lineHeight:1,background:"none",border:"none",cursor:"pointer",padding:"0 2px",borderBottom:"2px solid rgba(200,169,110,0.35)"}}>
                {holeIdx+1}<span style={{fontSize:14}}>▾</span>
              </button>
              <span style={{fontSize:13,color:"#9ca3af",marginLeft:2}}>Par {hd.par}</span>
              {hd.yards>0&&<span style={{fontSize:11,color:"#6b7280",marginLeft:2}}>{hd.yards}y</span>}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...S.iconBtn,color:showYards?"#c8a96e":"#e8dcc8",border:showYards?"1px solid rgba(200,169,110,0.4)":"none"}} onClick={()=>setShowYards(v=>!v)}>📐</button>
              <button style={S.iconBtn} onClick={()=>setScreen("scorecard_view")}>📋</button>
            </div>
          </div>

          {selCourse&&<div style={{margin:"0 20px 4px",fontSize:11,color:"#4b5563"}}>{selCourse.name} · {TEE_META[selTeeId]?.label||""} Tees{hd.hdcp?` · Hdcp ${hd.hdcp}`:""}</div>}

          {/* GPS + Wind strip */}
          <div style={{display:"flex",gap:8,margin:"4px 20px 10px",flexWrap:"wrap"}}>
            <div style={{...S.badge,background:gpsErr==="sim"?"#2d2208":tracking?"#1a472a":"#3d1515"}}><span style={{fontSize:10,color:gpsErr==="sim"?"#fbbf24":tracking?"#4ade80":"#f87171"}}>{!tracking?"📡 Off":gpsErr==="sim"?"📡 Sim":`📡 ±${gps?.acc||"?"}m`}</span></div>
            {windLoad&&<div style={{...S.badge,background:"#0c1a2e"}}><span style={{fontSize:10,color:"#6b7280"}}>🌬️…</span></div>}
            {wind&&!windLoad&&<div style={{...S.badge,background:"#0c1a2e"}}><span style={{fontSize:10,color:wStr(wind.s).c,fontWeight:600}}>🌬️ {wind.s}mph {wind.d}{wind.sim?" (sim)":""}</span></div>}
          </div>

          {/* Always-visible distance strip */}
          {teeYards>0&&(
            <div style={{margin:"0 20px 10px"}}>
              <div style={{display:"flex",gap:6}}>
                {[{label:"Front",yards:remainFront,color:"#fbbf24"},{label:"Center",yards:remainCenter,color:"#c8a96e"},{label:"Back",yards:remainBack,color:"#fb923c"}].map(({label,yards,color})=>(
                  <div key={label} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,0.05)",border:`1px solid ${color}33`,borderRadius:12,padding:"8px 0"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color,lineHeight:1}}>{yards}</div>
                    <div style={{fontSize:9,color:"#6b7280",letterSpacing:1,marginTop:2,textTransform:"uppercase"}}>{label}</div>
                  </div>
                ))}
              </div>
              {shotsTraveled>0&&<div style={{fontSize:10,color:"#4b5563",textAlign:"center",marginTop:4}}>{shotsTraveled}y traveled · {teeYards}y total</div>}
            </div>
          )}

          {/* Hazards panel — toggle with 📐 */}
          {showYards&&teeYards>0&&hazardsAhead.length>0&&(
            <div style={{margin:"0 20px 10px",background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"6px 14px 4px"}}><span style={S.lbl}>HAZARDS AHEAD</span></div>
              {hazardsAhead.map((h,i)=>{
                const isW=h.type==="water";const color=isW?"#38bdf8":"#d97706";
                const sideLabel=h.side==="both"?"Both sides":h.side==="left"?"◀ Left":"▶ Right";
                return(<div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",borderTop:i>0?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{isW?"💧":"🏖️"}</span>
                  <div style={{flex:1}}><div style={{fontSize:12,color:"#e8dcc8",fontWeight:600}}>{h.label}</div><div style={{fontSize:10,color:"#6b7280",marginTop:1}}>{sideLabel}</div></div>
                  <div style={{textAlign:"right",flexShrink:0}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color,lineHeight:1}}>{h.toFront}</div><div style={{fontSize:9,color:"#6b7280"}}>to front</div></div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#4ade80",lineHeight:1}}>{h.toCarry}</div><div style={{fontSize:9,color:"#6b7280"}}>to carry</div></div>
                </div>);
              })}
            </div>
          )}
          {showYards&&teeYards>0&&hazardsAhead.length===0&&(
            <div style={{margin:"0 20px 10px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"8px 14px",fontSize:12,color:"#374151",textAlign:"center"}}>No hazards ahead ✅</div>
          )}

          {/* Caddie bubble */}
          <div style={S.caddie}><span style={{fontSize:22,flexShrink:0}}>🎩</span><div style={{fontSize:13,color:"#d4c4a0",lineHeight:1.5,fontStyle:"italic"}}>{msg}</div></div>

          {/* Shot log */}
          <div style={{margin:"0 20px 10px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <span style={S.lbl}>HOLE {holeIdx+1} · {hd.shots.length} SHOT{hd.shots.length!==1?"S":""}</span>
              {hd.shots.length>0&&<button style={S.undoBtn} onClick={undoLast}>↩ Undo</button>}
            </div>
            {hd.shots.length===0&&hd.putts===0&&<div style={{fontSize:12,color:"#374151"}}>No shots yet</div>}
            {hd.shots.map((sh,i)=>{const lie=LIES.find(l=>l.id===sh.lie);return(
              <div key={sh.id} style={S.shotRow}>
                <div style={S.shotBadge}>{i+1}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#e8dcc8"}}>{sh.club}{sh.penalty&&<span style={{color:"#f87171",fontSize:11}}> ⚠️</span>}</div><div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{lie?.emoji} {lie?.label}{sh.distYards?` · ${sh.distYards}y`:""}</div></div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button style={{fontSize:11,color:"#c8a96e",background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.25)",borderRadius:6,padding:"3px 8px",cursor:"pointer"}} onClick={()=>openEditShot(sh)}>Edit</button>
                </div>
              </div>);})}
            {hd.putts>0&&(<div style={{...S.shotRow,background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)"}}><div style={{...S.shotBadge,background:"rgba(74,222,128,0.2)",color:"#4ade80"}}>⛳</div><div style={{flex:1,fontSize:13,fontWeight:600,color:"#86efac"}}>{hd.putts} Putt{hd.putts!==1?"s":""}</div></div>)}
          </div>

          {/* Score box */}
          {(hd.shots.length>0||hd.putts>0)&&(
            <div style={{margin:"0 20px 10px",background:"rgba(200,169,110,0.06)",border:"1px solid rgba(200,169,110,0.15)",borderRadius:14,padding:"12px 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontSize:9,letterSpacing:2,color:"#6b7280",textTransform:"uppercase"}}>Score</div><div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:30,fontFamily:"'Bebas Neue',sans-serif",color:"#c8a96e",lineHeight:1}}>{finalScore(hd)}</span><span style={{fontSize:12,color:finalScore(hd)-hd.par<0?"#4ade80":finalScore(hd)-hd.par>0?"#f87171":"#6b7280"}}>{finalScore(hd)-hd.par===0?"E":finalScore(hd)-hd.par>0?`+${finalScore(hd)-hd.par}`:finalScore(hd)-hd.par}</span></div></div>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:"#6b7280"}}>Adjust</span><button style={S.adjBtn} onClick={()=>adjSc(-1)}>−</button><span style={{fontSize:13,color:"#e8dcc8",minWidth:18,textAlign:"center"}}>{hd.scoreAdj>0?`+${hd.scoreAdj}`:hd.scoreAdj===0?"0":hd.scoreAdj}</span><button style={S.adjBtn} onClick={()=>adjSc(1)}>+</button></div>
              </div>
            </div>
          )}
          {played.length>0&&<div style={{margin:"0 20px 10px",display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:11,color:"#6b7280"}}>Round:</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#c8a96e"}}>{totSc}</span><span style={{fontSize:12,color:roundDiff<=0?"#4ade80":"#fb923c"}}>{roundDiff===0?"E":roundDiff>0?`+${roundDiff}`:roundDiff}</span><span style={{fontSize:11,color:"#4b5563"}}>thru {played.length}</span></div>}

          {/* Bottom bars */}
          {ss===SS.IDLE&&<div style={S.fixedBar}><div style={{display:"flex",gap:10}}><button style={S.shotBtn} onClick={()=>setSS(SS.CLUB)}>+ New Shot</button><button style={S.nextBtn} onClick={goNext}>{holeIdx<17?"Next Hole →":"Finish 🏁"}</button></div></div>}
          {ss===SS.FLIGHT&&<div style={S.fixedBar}><div style={{display:"flex",alignItems:"center",gap:12,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:14,padding:"13px 14px"}}><span style={{fontSize:22}}>🚶</span><span style={{flex:1,fontSize:13,color:"#86efac",fontWeight:500}}>Walk to your ball…</span><button style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:12,padding:"11px 14px",fontSize:13,fontWeight:700,color:"#0e1117",cursor:"pointer",whiteSpace:"nowrap"}} onClick={onMark}>📍 Ball Here</button></div></div>}

          {/* Hole Picker */}
          {holePick&&<div style={S.overlay} onClick={()=>setHolePick(false)}><div style={{...S.sheet,gap:14}} onClick={e=>e.stopPropagation()}><div style={S.sheetTitle}>GO TO HOLE</div><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>{Array.from({length:18},(_,i)=>i+1).map(n=>(<button key={n} style={{background:n===holeIdx+1?"#c8a96e":"rgba(255,255,255,0.06)",border:`1px solid ${n===holeIdx+1?"#c8a96e":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"12px 0",fontSize:15,fontWeight:700,color:n===holeIdx+1?"#0e1117":"#e8dcc8",cursor:"pointer"}} onClick={()=>goHole(n)}>{n}</button>))}</div><button style={S.ghost} onClick={()=>setHolePick(false)}>Cancel</button></div></div>}

          {/* Club Select */}
          {ss===SS.CLUB&&(()=>{
            const clubWin=prof.settings?.clubStatsWindow||10;
            const clubRounds=prof.rounds.slice(0,clubWin);
            const cStats=selClub?clubStatsFor(clubRounds,selClub):null;
            return(<div style={S.overlay}><div style={S.sheet}>
              <div style={S.sheetTitle}>Select Club</div>

              {/* Distance to green — always shown at top of club select */}
              {teeYards>0&&(
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"10px 12px"}}>
                  <div style={{...S.lbl,marginBottom:8,textAlign:"center"}}>DISTANCE TO GREEN</div>
                  <div style={{display:"flex",gap:6}}>
                    {[{label:"Front",yards:remainFront,color:"#fbbf24"},{label:"Center",yards:remainCenter,color:"#c8a96e"},{label:"Back",yards:remainBack,color:"#fb923c"}].map(({label,yards,color})=>(
                      <div key={label} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,0.05)",border:`1px solid ${color}44`,borderRadius:10,padding:"7px 0"}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color,lineHeight:1}}>{yards}</div>
                        <div style={{fontSize:8,color:"#6b7280",letterSpacing:1,marginTop:2,textTransform:"uppercase"}}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {wind&&<div style={{textAlign:"center",fontSize:11,color:wStr(wind.s).c,marginTop:8}}>🌬️ {wind.s}mph {wind.d}</div>}
                </div>
              )}
              {!teeYards&&wind&&<div style={{textAlign:"center",fontSize:11,color:wStr(wind.s).c}}>🌬️ {wind.s}mph {wind.d}</div>}
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{CLUBS.map(c=>(<button key={c} style={{...S.clubChip,background:selClub===c?"#c8a96e":"rgba(255,255,255,0.07)",color:selClub===c?"#0e1117":"#e8dcc8",borderColor:selClub===c?"#c8a96e":"rgba(255,255,255,0.1)"}} onClick={()=>setSelClub(c)}>{c}</button>))}</div>
              {selClub&&selClub!=="Putter"&&(
                <div style={{background:"rgba(200,169,110,0.07)",border:"1px solid rgba(200,169,110,0.2)",borderRadius:14,padding:"12px 14px"}}>
                  <div style={{...S.lbl,marginBottom:8}}>YOUR {selClub.toUpperCase()} STATS</div>
                  {cStats?(
                    <>
                      <div style={{display:"flex",gap:8,marginBottom:10}}>
                        {[{l:"AVG YDS",v:cStats.avg??'—',c:"#c8a96e"},{l:"P90 YDS",v:cStats.p90??'—',c:"#4ade80"},{l:"SHOTS",v:cStats.shots,c:"#9ca3af"}].map(({l,v,c})=>(
                          <div key={l} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 0"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:c,lineHeight:1}}>{v}</div><div style={{fontSize:8,color:"#6b7280",marginTop:2}}>{l}</div></div>
                        ))}
                      </div>
                      {cStats.left!==null&&(<>
                        <div style={{...S.lbl,marginBottom:6}}>MISS PATTERN</div>
                        <div style={{display:"flex",gap:6,marginBottom:6}}>
                          {[{l:"◀ Left",v:cStats.left,c:"#3b82f6"},{l:"On Line",v:cStats.center,c:"#4ade80"},{l:"Right ▶",v:cStats.right,c:"#f87171"}].map(({l,v,c})=>(
                            <div key={l} style={{flex:1,textAlign:"center",background:c+"18",border:`1px solid ${c}44`,borderRadius:8,padding:"6px 0"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:c,lineHeight:1}}>{v}%</div><div style={{fontSize:8,color:"#6b7280",marginTop:1}}>{l}</div></div>
                          ))}
                        </div>
                        <div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden",gap:1}}>
                          <div style={{width:`${cStats.left}%`,background:"#3b82f6",borderRadius:"3px 0 0 3px"}}/><div style={{width:`${cStats.center}%`,background:"#4ade80"}}/><div style={{width:`${cStats.right}%`,background:"#f87171",borderRadius:"0 3px 3px 0"}}/>
                        </div>
                      </>)}
                    </>
                  ):<div style={{textAlign:"center",fontSize:12,color:"#4b5563",padding:"8px 0"}}>No history yet for {selClub}</div>}
                </div>
              )}
              {selClub==="Putter"&&<div style={{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#86efac",textAlign:"center"}}>⛳ Goes straight to putt count</div>}
              <button style={{...S.btn,opacity:selClub?1:0.4}} onClick={onClubConfirm} disabled={!selClub}>{selClub==="Putter"?"Count Putts →":"Confirm Club →"}</button>
              <button style={S.ghost} onClick={()=>{setSS(SS.IDLE);setSelClub(null);}}>Cancel</button>
            </div></div>);
          })()}

          {/* Swing screen */}
          {ss===SS.READY&&<div style={S.overlay}><div style={S.sheet}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:50,color:"#4ade80",textAlign:"center",letterSpacing:4,lineHeight:1}}>{selClub}</div>
            {wind&&<div style={{textAlign:"center",fontSize:11,color:wStr(wind.s).c}}>🌬️ {wind.s}mph {wind.d}</div>}
            <div style={S.sheetTitle}>Address the Ball</div>
            <p style={{fontSize:13,color:"#9ca3af",textAlign:"center",lineHeight:1.6}}>Tap SWING right before you hit. Locks GPS origin.</p>
            <button style={{...S.btn,background:"linear-gradient(135deg,#22c55e,#16a34a)",fontSize:20,padding:22,letterSpacing:3}} onClick={onSwing}>🏌️  SWING</button>
            <button style={S.ghost} onClick={()=>setSS(SS.CLUB)}>← Change Club</button>
          </div></div>}

          {/* Landing */}
          {ss===SS.LAND&&<div style={S.overlay}><div style={{...S.sheet,gap:12}}>
            <div style={{textAlign:"center"}}><div style={S.sheetTitle}>LOG THE SHOT</div>{pendDist&&<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:38,color:"#c8a96e",lineHeight:1}}>{pendDist} yds</div>}{wind&&<div style={{fontSize:11,color:wStr(wind.s).c,marginTop:2}}>🌬️ {wind.s}mph {wind.d}</div>}</div>
            <div><div style={S.lbl}>WHERE DID IT LAND?</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{LIES.map(l=>(<button key={l.id} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,padding:"10px 4px",cursor:"pointer",gap:2,border:`2px solid ${selLie===l.id?l.color:"rgba(255,255,255,0.08)"}`,background:selLie===l.id?l.color+"22":"rgba(255,255,255,0.04)"}} onClick={()=>onLie(l)}><span style={{fontSize:18}}>{l.emoji}</span><span style={{fontSize:10,color:selLie===l.id?l.color:"#9ca3af",fontWeight:600,marginTop:2}}>{l.label}</span></button>))}</div></div>
            {selLie==="water_ob"&&<div style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.3)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#7dd3fc",textAlign:"center"}}>⚠️ Penalty stroke auto-applied</div>}
            <div><div style={S.lbl}>DIRECTION</div><div style={{display:"flex",gap:8}}>{DIRS.map(d=>(<button key={d.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",borderRadius:12,padding:"10px 4px",cursor:"pointer",gap:3,background:selDir===d.id?"rgba(200,169,110,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${selDir===d.id?"#c8a96e":"rgba(255,255,255,0.08)"}`}} onClick={()=>setSelDir(d.id)}><span style={{fontSize:16}}>{d.emoji}</span><span style={{fontSize:10,color:selDir===d.id?"#c8a96e":"#9ca3af"}}>{d.label}</span></button>))}</div></div>

            {selLie!=="water_ob"&&<button style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,padding:"10px",cursor:"pointer",gap:3,width:"100%",background:penalty?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${penalty?"#f87171":"rgba(255,255,255,0.08)"}`}} onClick={()=>setPenalty(p=>!p)}><span style={{fontSize:16}}>⚠️</span><span style={{fontSize:12,color:penalty?"#f87171":"#9ca3af"}}>{penalty?"Penalty stroke":"No penalty"}</span></button>}
            <button style={{...S.btn,opacity:selLie?1:0.4}} onClick={onConfirmLand} disabled={!selLie}>Confirm Shot ✓</button>
            <button style={S.ghost} onClick={()=>{resetShot();setMsg("No worries — tap New Shot when ready.");}}>Cancel</button>
          </div></div>}

          {/* Putts */}
          {ss===SS.PUTT&&<div style={S.overlay}><div style={S.sheet}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,color:"#4ade80",textAlign:"center",letterSpacing:4}}>ON THE GREEN</div>
            <div style={{fontSize:13,color:"#9ca3af",textAlign:"center",marginBottom:4}}>How many putts?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[{n:1,color:"#4ade80",bg:"rgba(74,222,128,0.12)"},{n:2,color:"#c8a96e",bg:"rgba(200,169,110,0.12)"},{n:3,color:"#f87171",bg:"rgba(248,113,113,0.12)"},{n:4,color:"#f43f5e",bg:"rgba(244,63,94,0.12)"}].map(({n,color,bg})=>(
                <button key={n} style={{background:bg,border:`2px solid ${color}`,borderRadius:16,padding:"16px 0",display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",gap:4}} onClick={()=>onPutts(n)}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,color,lineHeight:1}}>{n}{n===4?"+":""}</span>
                  <span style={{fontSize:10,color,opacity:0.8}}>{n===4?"4+ putts":`${n} putt${n>1?"s":""}`}</span>
                </button>
              ))}
            </div>
            <button style={S.ghost} onClick={()=>{resetShot();setMsg("No worries — tap New Shot when ready.");}}>Cancel</button>
          </div></div>}
        </div>
      )}

      {/* ════ SCORECARD VIEW ══════════════════════════════════════════════ */}
      {screen==="scorecard_view"&&(
        <div style={{display:"flex",flexDirection:"column",paddingBottom:60,minHeight:"100vh"}}>
          <div style={S.hdr}><button style={S.iconBtn} onClick={()=>setScreen("round")}>←</button><span style={S.pgT}>SCORECARD</span><div style={{width:36}}/></div>
          {selCourse&&<div style={{margin:"0 20px 8px",fontSize:12,color:"#6b7280"}}>{selCourse.name} · {TEE_META[selTeeId]?.label||""} Tees</div>}
          <div style={{display:"flex",justifyContent:"space-around",margin:"10px 20px",background:"rgba(200,169,110,0.07)",border:"1px solid rgba(200,169,110,0.15)",borderRadius:16,padding:"16px 0"}}>
            {[{val:totSc||"—",lbl:"Total",col:"#c8a96e"},{val:totSc?(roundDiff===0?"E":roundDiff>0?`+${roundDiff}`:roundDiff):"—",lbl:"vs Par",col:roundDiff<0?"#4ade80":roundDiff>0?"#f87171":"#c8a96e"},{val:holes.reduce((a,h)=>a+h.shots.length,0),lbl:"Shots",col:"#c8a96e"}].map(s=>(<div key={s.lbl} style={{textAlign:"center"}}><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:s.col,lineHeight:1}}>{s.val}</div><div style={{fontSize:9,letterSpacing:2,color:"#6b7280",textTransform:"uppercase",marginTop:3}}>{s.lbl}</div></div>))}
          </div>
          <div style={{margin:"0 20px"}}>
            <div style={{display:"grid",gridTemplateColumns:"24px 40px 26px 1fr 32px 30px",padding:"5px 12px",fontSize:9,letterSpacing:2,color:"#6b7280",textTransform:"uppercase",gap:4}}><span>#</span><span>Par</span><span>Hcp</span><span/><span style={{textAlign:"right"}}>Sc</span><span style={{textAlign:"right"}}>+/-</span></div>
            {holes.map((h,i)=>{
              const isP=h.shots.length>0||h.putts>0;const sc=finalScore(h);const df=isP?sc-h.par:null;const isExp=expHole===i;
              return(<div key={i} style={{borderRadius:10,background:i%2===0?"rgba(255,255,255,0.02)":"transparent",marginBottom:2}}>
                <button onClick={()=>setExpHole(isExp?null:i)} style={{display:"grid",gridTemplateColumns:"24px 40px 26px 1fr 32px 30px",padding:"8px 12px",width:"100%",background:"transparent",border:"none",alignItems:"center",gap:4,cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:12,fontWeight:700,color:i===holeIdx?"#c8a96e":isP?"#e8dcc8":"#6b7280"}}>{i+1}</span>
                  <span style={{fontSize:11,color:"#6b7280"}}>Par {h.par}</span>
                  <span style={{fontSize:10,color:"#4b5563"}}>{h.hdcp}</span>
                  <span style={{fontSize:10,color:"#374151"}}>{isP?`${h.shots.length>0?h.shots.length+"S":""} ${h.putts>0?h.putts+"P":""}`.trim():""}</span>
                  <span style={{fontSize:14,fontWeight:700,textAlign:"right",color:df===null?"#444":df<0?"#4ade80":df>0?"#f87171":"#c8a96e"}}>{isP?sc:"—"}</span>
                  <span style={{fontSize:11,fontWeight:600,textAlign:"right",color:df===null?"#333":df<0?"#4ade80":df>0?"#f87171":"#c8a96e"}}>{df===null?"":(df===0?"E":df>0?`+${df}`:df)}</span>
                </button>
                {isExp&&<div style={{padding:"8px 12px 12px",display:"flex",flexDirection:"column",gap:6}}>
                  {h.shots.length===0&&h.putts===0&&<div style={{fontSize:12,color:"#4b5563"}}>No shots recorded.</div>}
                  {h.shots.map((sh,si)=>{const lie=LIES.find(l=>l.id===sh.lie);return(<div key={sh.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"7px 10px"}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(200,169,110,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#c8a96e",fontWeight:700,flexShrink:0}}>{si+1}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#e8dcc8"}}>{sh.club}{sh.penalty&&" ⚠️"}</div><div style={{fontSize:10,color:"#6b7280"}}>{lie?.emoji} {lie?.label}{sh.distYards?` · ${sh.distYards}y`:""}</div></div>
                    <div style={{display:"flex",gap:5}}>
                      <button style={{fontSize:10,color:"#c8a96e",background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.25)",borderRadius:5,padding:"2px 7px",cursor:"pointer"}} onClick={()=>{setHoleIdx(i);openEditShot(sh);setScreen("round");}}>Edit</button>
                      <button style={{fontSize:10,color:"#f87171",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:5,padding:"2px 7px",cursor:"pointer"}} onClick={()=>delShot(i,sh.id)}>Del</button>
                    </div>
                  </div>);})}
                  {h.putts>0&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:8,padding:"7px 10px"}}><div style={{width:18,height:18,borderRadius:"50%",background:"rgba(74,222,128,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#4ade80",flexShrink:0}}>⛳</div><div style={{flex:1,fontSize:12,fontWeight:600,color:"#86efac"}}>{h.putts} Putt{h.putts!==1?"s":""}</div><div style={{display:"flex",gap:4}}><button style={{...S.adjBtn,width:24,height:24,fontSize:12}} onClick={()=>adjPutts(i,-1)}>−</button><button style={{...S.adjBtn,width:24,height:24,fontSize:12}} onClick={()=>adjPutts(i,1)}>+</button></div></div>}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0"}}><span style={{fontSize:9,color:"#6b7280",letterSpacing:2,textTransform:"uppercase"}}>Adjust Score</span><div style={{display:"flex",gap:6,alignItems:"center"}}><button style={S.adjBtn} onClick={()=>adjScHole(i,-1)}>−</button><span style={{fontSize:12,color:"#e8dcc8",minWidth:16,textAlign:"center"}}>{h.scoreAdj>0?`+${h.scoreAdj}`:h.scoreAdj===0?"0":h.scoreAdj}</span><button style={S.adjBtn} onClick={()=>adjScHole(i,1)}>+</button></div></div>
                  <button style={{background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.2)",borderRadius:10,padding:"7px",fontSize:12,color:"#c8a96e",cursor:"pointer"}} onClick={()=>{setHoleIdx(i);resetShot();setScreen("round");setExpHole(null);}}>▶ Go to Hole {i+1}</button>
                </div>}
              </div>);
            })}
          </div>
          <div style={{padding:"16px 20px",display:"flex",gap:10}}>
            <button style={{...S.ghost,flex:1}} onClick={()=>setScreen("round")}>← Back</button>
            <button style={{...S.btn,flex:1}} onClick={saveRound}>Save Round ✓</button>
          </div>
        </div>
      )}

      {/* ════ SHOT EDIT ═══════════════════════════════════════════════════ */}
      {editShot&&<div style={S.overlay}><div style={{...S.sheet,gap:12}}>
        <div style={S.sheetTitle}>EDIT SHOT</div>
        <div><div style={S.lbl}>CLUB</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{CLUBS.map(c=>(<button key={c} style={{...S.clubChip,background:editShot.club===c?"#c8a96e":"rgba(255,255,255,0.07)",color:editShot.club===c?"#0e1117":"#e8dcc8",borderColor:editShot.club===c?"#c8a96e":"rgba(255,255,255,0.1)"}} onClick={()=>setEditShot(e=>({...e,club:c}))}>{c}</button>))}</div></div>
        <div><div style={S.lbl}>DISTANCE (YDS)</div><input type="number" placeholder="e.g. 245" value={editShot.distYards} onChange={ev=>setEditShot(e=>({...e,distYards:ev.target.value}))} style={S.input}/></div>
        <div><div style={S.lbl}>LIE</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{LIES.map(l=>(<button key={l.id} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,padding:"8px 4px",cursor:"pointer",gap:2,border:`2px solid ${editShot.lie===l.id?l.color:"rgba(255,255,255,0.08)"}`,background:editShot.lie===l.id?l.color+"22":"rgba(255,255,255,0.04)"}} onClick={()=>setEditShot(e=>({...e,lie:l.id,penalty:l.penalty||e.penalty}))}><span style={{fontSize:16}}>{l.emoji}</span><span style={{fontSize:9,color:editShot.lie===l.id?l.color:"#9ca3af",fontWeight:600,marginTop:1}}>{l.label}</span></button>))}</div></div>
        <div><div style={S.lbl}>DIRECTION</div><div style={{display:"flex",gap:8}}>{DIRS.map(d=>(<button key={d.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",borderRadius:12,padding:"8px 4px",cursor:"pointer",gap:3,background:editShot.direction===d.id?"rgba(200,169,110,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${editShot.direction===d.id?"#c8a96e":"rgba(255,255,255,0.08)"}`}} onClick={()=>setEditShot(e=>({...e,direction:d.id}))}><span style={{fontSize:15}}>{d.emoji}</span><span style={{fontSize:9,color:editShot.direction===d.id?"#c8a96e":"#9ca3af"}}>{d.label}</span></button>))}</div></div>

        <button style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,padding:"10px",cursor:"pointer",gap:3,width:"100%",background:editShot.penalty?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${editShot.penalty?"#f87171":"rgba(255,255,255,0.08)"}`}} onClick={()=>setEditShot(e=>({...e,penalty:!e.penalty}))}><span style={{fontSize:15}}>⚠️</span><span style={{fontSize:12,color:editShot.penalty?"#f87171":"#9ca3af"}}>{editShot.penalty?"Penalty stroke":"No penalty"}</span></button>
        <button style={S.btn} onClick={saveEditShot}>Save Changes ✓</button>
        <button style={S.ghost} onClick={()=>setEditShot(null)}>Cancel</button>
      </div></div>}

      {/* ════ NEW PROFILE ═════════════════════════════════════════════════ */}
      {showNew&&<div style={S.overlay}><div style={S.sheet}>
        <div style={S.sheetTitle}>NEW PROFILE</div>
        <div><div style={S.lbl}>NAME</div><input style={S.input} placeholder="Your name" value={newName} onChange={e=>setNewName(e.target.value)}/></div>
        <div><div style={S.lbl}>HANDICAP (OPTIONAL)</div><input style={S.input} placeholder="e.g. 12.4" type="number" value={newHdcp} onChange={e=>setNewHdcp(e.target.value)}/></div>
        <button style={S.btn} onClick={addProfile}>Create Profile</button>
        <button style={S.ghost} onClick={()=>setShowNew(false)}>Cancel</button>
      </div></div>}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css=`
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}body{background:#0e1117;}
  ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px;}
`;
const S={
  root:       {fontFamily:"'DM Sans',sans-serif",background:"linear-gradient(160deg,#0e1117 0%,#111827 60%,#0a1a0e 100%)",minHeight:"100vh",color:"#e8dcc8",maxWidth:430,margin:"0 auto",position:"relative",overflowX:"hidden"},
  toast:      {position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#1e2d1a",border:"1px solid #4ade8060",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,color:"#c8f5a0",zIndex:999,whiteSpace:"nowrap",boxShadow:"0 8px 30px #00000080"},
  page:       {display:"flex",flexDirection:"column",minHeight:"100vh",paddingBottom:40},
  round:      {display:"flex",flexDirection:"column",minHeight:"100vh",paddingBottom:120},
  logoTitle:  {fontFamily:"'Bebas Neue',sans-serif",fontSize:60,letterSpacing:8,color:"#c8a96e",lineHeight:1},
  logoSub:    {fontSize:12,color:"#6b7280",letterSpacing:3,textTransform:"uppercase"},
  tabBar:     {display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.15)",flexShrink:0},
  tab:        {flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0",background:"transparent",border:"none",cursor:"pointer",gap:1},
  hdr:        {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px 10px",flexShrink:0},
  pgT:        {fontSize:11,letterSpacing:3,color:"#9ca3af",textTransform:"uppercase"},
  iconBtn:    {background:"rgba(255,255,255,0.06)",border:"none",color:"#e8dcc8",borderRadius:10,width:36,height:36,fontSize:18,cursor:"pointer",flexShrink:0},
  lbl:        {fontSize:9,letterSpacing:3,color:"#6b7280",textTransform:"uppercase"},
  badge:      {borderRadius:8,padding:"4px 10px"},
  caddie:     {margin:"0 20px 12px",display:"flex",alignItems:"flex-start",gap:10,background:"rgba(200,169,110,0.07)",border:"1px solid rgba(200,169,110,0.18)",borderRadius:14,padding:12,flexShrink:0},
  undoBtn:    {fontSize:11,color:"#9ca3af",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"3px 10px",cursor:"pointer"},
  shotRow:    {display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"9px 12px",marginBottom:4},
  shotBadge:  {width:22,height:22,borderRadius:"50%",background:"rgba(200,169,110,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#c8a96e",fontWeight:700,flexShrink:0},
  adjBtn:     {background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,width:30,height:30,fontSize:16,color:"#e8dcc8",cursor:"pointer"},
  fixedBar:   {position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,padding:"14px 20px 32px",background:"linear-gradient(to top,#0e1117 70%,transparent)"},
  shotBtn:    {background:"rgba(200,169,110,0.15)",border:"1px solid rgba(200,169,110,0.3)",borderRadius:14,padding:"14px",fontSize:14,fontWeight:600,color:"#c8a96e",cursor:"pointer",width:"47%"},
  nextBtn:    {background:"linear-gradient(135deg,#1a472a,#0f3320)",border:"none",borderRadius:14,padding:"14px",fontSize:14,fontWeight:600,color:"#4ade80",cursor:"pointer",width:"47%",marginLeft:12},
  overlay:    {position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",zIndex:200},
  sheet:      {background:"#141c14",borderRadius:"20px 20px 0 0",padding:"20px 20px 44px",width:"100%",display:"flex",flexDirection:"column",gap:12,maxHeight:"90vh",overflowY:"auto"},
  sheetTitle: {fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#c8a96e",letterSpacing:4,textAlign:"center"},
  clubChip:   {border:"1px solid",borderRadius:10,padding:"7px 12px",fontSize:13,fontWeight:500,cursor:"pointer"},
  btn:        {width:"100%",background:"linear-gradient(135deg,#c8a96e,#a07840)",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:700,color:"#0e1117",cursor:"pointer",letterSpacing:1},
  ghost:      {width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"13px",fontSize:14,color:"#9ca3af",cursor:"pointer"},
  input:      {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px 14px",fontSize:14,color:"#e8dcc8",outline:"none"},
  card:       {width:"100%",borderRadius:14,padding:"14px 16px",cursor:"pointer"},
  searchInput:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"11px 14px 11px 40px",fontSize:14,color:"#e8dcc8",outline:"none"},
};
