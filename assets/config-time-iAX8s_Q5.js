function l(t=new Date){const e=new Date(t.getTime()+288e5).toISOString();return e.slice(0,10).replaceAll("-","")+"T"+e.slice(11,23).replaceAll(":","").replace(".","_")+"+0800"}export{l as t};
