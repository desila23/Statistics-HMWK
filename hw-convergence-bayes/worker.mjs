import {samplePaths} from './core.mjs';
self.onmessage=({data})=>{
  try{self.postMessage({result:samplePaths(data)});}
  catch(e){self.postMessage({error:e.message});}
};
