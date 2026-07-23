import * as http from 'http';
import * as dotenv from 'dotenv';
dotenv.config({path:'.env'});

async function post(path: string, body: any) {
  const data = JSON.stringify(body);
  return new Promise<any>(resolve => {
    const req = http.request('http://127.0.0.1:8180/pls'+path, {
      method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'X-MCP-Api-Key':'mcp-write-key-2024'},
    }, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
        try{resolve({httpStatus:res.statusCode,body:JSON.parse(d)})}
        catch{resolve({httpStatus:res.statusCode,body:d})}
      });
    }); req.on('error',()=>resolve({httpStatus:0,body:'conn err'})); req.write(data); req.end();
  });
}

console.log('=== 1. tag/add ===');
const t1 = await post('/mcp/write/tag/add',{tagCode:'T999',tagType:1,status:1,power:100,isBind:0});
console.log(JSON.stringify(t1,null,2));

console.log('\n=== 2. tag/add (minimal) ===');
const t2 = await post('/mcp/write/tag/add',{tagCode:'T888'});
console.log(JSON.stringify(t2,null,2));

console.log('\n=== 3. person/add ===');
const p1 = await post('/mcp/write/person/add',{name:'测试人员',code:'P999',tagCode:'T999'});
console.log(JSON.stringify(p1,null,2));

console.log('\n=== 4. car/add (fix defaultNumber=int) ===');
const c1 = await post('/mcp/write/car/add',{carCode:'C999',carType:1,defaultNumber:1});
console.log(JSON.stringify(c1,null,2));

console.log('\n=== 5. goods/add ===');
const g1 = await post('/mcp/write/goods/add',{name:'测试物资',code:'G999'});
console.log(JSON.stringify(g1,null,2));

console.log('\n=== 6. goods/update ===');
const g2 = await post('/mcp/write/goods/update',{id:1,name:'更新物资'});
console.log(JSON.stringify(g2,null,2));

console.log('\n=== 7. area/add (with area_type) ===');
const a1 = await post('/mcp/write/area/add',{name:'测试区域',areaCode:'A999',areaType:1});
console.log(JSON.stringify(a1,null,2));

console.log('\n=== 8. anchor/add (check required fields) ===');
const an1 = await post('/mcp/write/anchor/add',{code:'AC999',anchorType:1,anchorIp:'192.168.1.1'});
console.log(JSON.stringify(an1,null,2));

console.log('\n=== 9. area_rule/add (fittingMethod enum) ===');
const ar1 = await post('/mcp/write/area_rule/add',{name:'测试区域规则',fittingMethod:'NEAREST'});
console.log(JSON.stringify(ar1,null,2));

console.log('\n=== 10. person/delete ===');
const pd = await post('/mcp/write/person/delete',{ids:['99999']});
console.log(JSON.stringify(pd,null,2));

console.log('\n=== 11. car/delete ===');
const cd = await post('/mcp/write/car/delete',{ids:['99999']});
console.log(JSON.stringify(cd,null,2));

console.log('\n=== 12. bind_person ===');
const bp = await post('/mcp/write/bind/person',{tagCode:'11',personnelId:'1'});
console.log(JSON.stringify(bp,null,2));