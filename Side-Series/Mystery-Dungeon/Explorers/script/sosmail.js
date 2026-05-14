var codeswitch=
"0D07190F041D2A3108132D180E1A1B29"+
"0120212211332600350A2B1F12232C17"+
"27101C300B022409320528342E031E0C"+
"25142F160615"

var codeswitch2=
"2E753F99096CBC617C2A964AF46D29FA"+
"90149D336FCB493C48807B4667011759"+
"B8FA70C0447848FB268081FCFD6170C7"+
"FEA870286C9C07A4CB3F70A38CD6FFB0"+
"7A3A3554E99A3B611641E9A390A3E9EE"+
"0EFADC9BD6FB24B5419A20BAB3517A36"+
"3E600E3D02B034576981EB67F3EB8C47"+
"93CE2AAF35F47487502C3968BB471A02"+
"A393642E8CADB1C461045FBD59211CE7"+
"0E29269770A9CD18A37B747096DEA672"+
"DD1393AA906CA7B5762FA87AC88106BB"+
"8575110CD2D1C9F88170EEC871533DAF"+
"76CB0DC15628E83C61644BB8EF3B4109"+
"720750ADF32E5C43FFC3B3327A3E9CA3"+
"C2AB106099FB088A90578A7F61902188"+
"55E8FC4B0D4A7A48C9B0C7A6D0047E05"


var wondercode=
"0C061308040D0F091002141200150B051703110A010E1607"

var chars="&67NPR89F0+#STXY45MCHJ-K12=%3Q@W"

var a8=
"04060A0E0A0B040D0F0D040A06100618"+
"041A0A2964150564150C64641A1A0D15"+
"331F1F1F151F100D141F0B1015151F05"+
"050B033346101F14140C644C29646402"

var charto=
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFF0BFF1B00FFFFFFFF0AFF16FFFF"+
"0918191C101101020607FFFFFF1AFFFF"+
"1EFFFF13FFFF08FF14FF1517FF1203FF"+
"041D050C0DFFFF1F0E0FFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"+
"FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"

function c2c(s,c){
 return parseInt(s.substr(c<<1,2),16)
}
function c2w(s,c){
 return c2c(s,c<<1)|(c2c(s,(c<<1)+1)<<8)
}


function CharToCode(c){
 return parseInt(charto.substr(c<<1,2),16)
}

function encodebits(astate,aout,aoutStart,iter){
 var bit=0
 var pointer=aoutStart
 var i=0
 for(i=0;i<iter;i++){
  var nextbyte=aout[pointer]
  var nextbit=nextbyte>>bit
  if(nextbit&1)
   astate.buf[astate.ptr]|=(1<<astate.bit)
  bit++
  if(bit==8){
   pointer++
   bit=0
  }
  astate.bit++
  if(astate.bit==8){
   astate.ptr++
   astate.bit=0
  }
  astate.totalbits++
 }
}

function decodebits(astate,aout,aoutStart,iter){
 var bit=0
 var pointer=aoutStart
 var i=0
 for(i=0;i<iter;i++){
  if(bit==0){
   aout[pointer]=0
  }
  nextbyte=astate.buf[astate.ptr]
  nextbit=nextbyte>>astate.bit
  if(nextbit&1)
   aout[pointer]|=(1<<bit)
  bit++
  if(bit==8){
   pointer++
   bit=0
  }
  astate.bit++
  if(astate.bit==8){
   astate.ptr++
   astate.bit=0
  }
  astate.totalbits++
 }
}

function dobits(astate,aout){
 var i
 var last=[0]
 for(i=0;i<0x38;i++){
  aout[i]=0
 }
 decodebits(astate,aout,0,4)
 //2043e10(dst,src+4)
 decodebits(astate,aout,4,7)
 decodebits(astate,aout,5,7)
 if(aout[0]==1){
  decodebits(astate,aout,8,0x18)
 }
 decodebits(astate,aout,0x14,0x40)
 decodebits(astate,aout,0x1C,4)
 decodebits(astate,aout,0x1D,0x50)
 if(aout[0]!=1){
  decodebits(astate,aout,0x27,10)//a0, ex.21dd878+0xa0
  decodebits(astate,aout,0x29,10)//a2
 }
 decodebits(astate,aout,0x2b,0x40)//a4
// r0=[r4+4]
// [r4+0xac]=[r0*0x12+0x2095d78]
// [r4+0xad]=1
 decodebits(astate,aout,0x33,1) // [sp]
}

function dobitsrev(astate,aout){
 var i
 for(i=0;i<0x22;i++){
  astate.buf[i]=0
 }
 encodebits(astate,aout,0,4)
 //2043e10(dst,src+4)
 encodebits(astate,aout,4,7)
 encodebits(astate,aout,5,7)
 if(aout[0]==1){
  encodebits(astate,aout,8,0x18)
 }
 encodebits(astate,aout,0x14,0x40)
 encodebits(astate,aout,0x1C,4)
 encodebits(astate,aout,0x1D,0x50)
 if(aout[0]!=1){
  encodebits(astate,aout,0x27,10)//a0, ex.21dd878+0xa0
  encodebits(astate,aout,0x29,10)//a2
 }
 encodebits(astate,aout,0x2b,0x40)//a4
// r0=[r4+4]
// [r4+0xac]=[r0*0x12+0x2095d78]
// [r4+0xad]=1
 encodebits(astate,aout,0x33,1) // [sp]
// aout[0x33]=last[0]&1 //[r4+0xae]=aout[45]
}

function wonderbits(astate,aout){
 var i
 var last=[0]
 for(i=0;i<26;i++){
  aout[i]=0
 }
 decodebits(astate,aout,0,4)
 decodebits(astate,aout,1,4)
 decodebits(astate,aout,2,4)
 decodebits(astate,aout,0x0c,11)
 decodebits(astate,aout,0x0e,11)
 decodebits(astate,aout,0x10,10)
 decodebits(astate,aout,0x12,4)
 decodebits(astate,aout,0x14,11)
 decodebits(astate,aout,0x16,1)
 decodebits(astate,aout,0x18,11)
 decodebits(astate,aout,0x8,0x18)
 decodebits(astate,aout,0x4,8)
 decodebits(astate,aout,0x5,8)
}

function wonderbitsrev(astate,aout){
 var i
 for(i=0;i<0x0F;i++){
  astate.buf[i]=0
 }
 encodebits(astate,aout,0,4)
 encodebits(astate,aout,1,4)
 encodebits(astate,aout,2,4)
 encodebits(astate,aout,0x0c,11)
 encodebits(astate,aout,0x0e,11)
 encodebits(astate,aout,0x10,10)
 encodebits(astate,aout,0x12,4)
 encodebits(astate,aout,0x14,11)
 encodebits(astate,aout,0x16,1)
 encodebits(astate,aout,0x18,11)
 encodebits(astate,aout,0x8,0x18)
 encodebits(astate,aout,0x4,8)
 encodebits(astate,aout,0x5,8)
}

function tostr(x){
 var nx=[]
 for(var i=0;i<x.length;i++){
  if(typeof x[i]!='undefined'){
   nx[i]=x[i].toString(16)
   if(nx[i].length==1)nx[i]="0"+nx[i]
  }
 }
 return nx.join(",")
}

function str2arr(x){
 var arr=[]
 for(var i=0;i<x.length;i++){
  arr[arr.length]=x.charAt(i)
 } 
 return arr
}

function convpasshelper(src,dst,size){
 var i
 var codes=[]
 var astate=new Object()
 for(i=0;i<size;i++){
  var tos=CharToCode(src[i].charCodeAt(0))
  codes[i]=tos
  if(tos==0xff){
   return 0
  }
 }
 r2=size*5+5
 if(r2<0)r2+=7
 r2>>=3
 astate.buf=[]
 astate.bit=astate.ptr=astate.totalbit=0
 for(i=0;i<r2;i++){
  astate.buf[i]=0
 }
 for(i=0;i<size;i++){
  encodebits(astate,codes,i,5); 
 }
 for(i=0;i<r2;i++){
  dst[i]=astate.buf[i]
 } 
 return 1
}

function convertpass(pass,aout){
 var i=0
 if(pass.length<0x36)
  return 0
 var newpass=[]
 pass=str2arr(pass)
 for(i=0;i<0x36;i++){
  var offset=c2c(codeswitch,i)
  var k=0,j=0
  if(offset!=k){
   k=offset
  }
  newpass[i]=pass[k]
 }
 var code=[]
 if(!convpasshelper(newpass,code,0x36))
  return 0
 var c=(code[0]&0x0F)+(code[0]>>4)+8
 var direction=(code[0]&0x01) ? 1 : -1
 c&=0xFF
 position=0
 for(i=1;i<0x21;i++){
  j=position*direction+code[0]
  j&=0xFF
  xor=c2c(codeswitch2,j)
  code[i]=(code[i]-xor)&0xFF
  position=(position+1)%c
 }
 var sum=0
 for(i=1;i<0x21;i++){
  sum+=code[i]+i
  sum&=0xFF
 }
 if(sum!=code[0]){
  return 0;
 }
 var astate=new Object()
 astate.buf=code.slice(1)
 astate.bit=astate.ptr=astate.totalbit=0
 dobits(astate,aout)
 return 1
}

function datatopass(pass){
 var astate=new Object()
 var astate2=new Object()
 var codes=[]
 var retpass=[]
 astate.buf=[]
 astate.bit=astate.ptr=astate.totalbit=0
 dobitsrev(astate,pass)
 var sum=0
 for(i=0;i<0x20;i++){
  sum+=astate.buf[i]+(i+1)
  sum&=0xFF
 }
 var c=(sum&0x0F)+(sum>>4)+8
 var direction=(sum&0x01) ? 1 : -1
 c&=0xFF
 position=0
 for(i=0;i<0x20;i++){
  j=position*direction+sum
  j&=0xFF
  xor=c2c(codeswitch2,j)
  astate.buf[i]=(astate.buf[i]+xor)&0xFF
  position=(position+1)%c
 }
 astate2.buf=[]
 astate2.bit=astate2.ptr=astate2.totalbit=0
 astate2.buf[0]=sum
 for(i=1;i<0x22;i++){
  astate2.buf[i]=astate.buf[i-1]
 }
 for(i=0;i<0x36;i++){
  decodebits(astate2,codes,i,5); 
 }
 for(i=0;i<0x36;i++){
  codes[i]=chars.charAt(codes[i])
 }
 for(i=0;i<0x36;i++){
  var offset=0
  for(j=0;j<0x36;j++){
   if(c2c(codeswitch,j)==i){
    offset=j
    break
   }
  }
  retpass[i]=codes[offset]
 }
 return retpass.join("")
}

function convertwonderpass(pass,aout){
 var i=0
 if(pass.length<0x18)
  return 0
 var newpass=[]
 pass=str2arr(pass)
 for(i=0;i<0x18;i++){
  var offset=c2c(wondercode,i)
  var k=0,j=0
  if(offset!=k){
   k=offset
  }
  newpass[i]=pass[k]
 }
 var code=[]
 if(!convpasshelper(newpass,code,0x18))
  return 0
 var c=(code[0]&0x0F)+(code[0]>>4)+8
 var direction=(code[0]&0x01) ? 1 : -1
 c&=0xFF
 position=0
 for(i=1;i<0x0F;i++){
  j=position*direction+code[0]
  j&=0xFF
  xor=c2c(codeswitch2,j)
  code[i]=(code[i]-xor)&0xFF
  position=(position+1)%c
 }
 var sum=0
 for(i=1;i<0x0F;i++){
  sum+=code[i]+i
  sum&=0xFF
 }
 if(sum!=code[0]){
  return 0;
 }
 var astate=new Object()
 astate.buf=code.slice(1)
 astate.bit=astate.ptr=astate.totalbit=0
 wonderbits(astate,aout)
 return 1
}

function datatowonderpass(pass){
 var astate=new Object()
 var astate2=new Object()
 var codes=[]
 var retpass=[]
 astate.buf=[]
 astate.bit=astate.ptr=astate.totalbit=0
 wonderbitsrev(astate,pass)
 var sum=0
 for(i=0;i<0x0E;i++){
  sum+=astate.buf[i]+(i+1)
  sum&=0xFF
 }
 var c=(sum&0x0F)+(sum>>4)+8
 var direction=(sum&0x01) ? 1 : -1
 c&=0xFF
 position=0
 for(i=0;i<0x0E;i++){
  j=position*direction+sum
  j&=0xFF
  xor=c2c(codeswitch2,j)
  astate.buf[i]=(astate.buf[i]+xor)&0xFF
  position=(position+1)%c
 }
 astate2.buf=[]
 astate2.bit=astate2.ptr=astate2.totalbit=0
 astate2.buf[0]=sum
 for(i=1;i<0x0F;i++){
  astate2.buf[i]=astate.buf[i-1]
 }
 for(i=0;i<0x18;i++){
  decodebits(astate2,codes,i,5); 
 }
 for(i=0;i<0x18;i++){
  codes[i]=chars.charAt(codes[i])
 }
 for(i=0;i<0x18;i++){
  var offset=0
  for(j=0;j<0x18;j++){
   if(c2c(wondercode,j)==i){
    offset=j
    break
   }
  }
  retpass[i]=codes[offset]
 }
 return retpass.join("")
}
