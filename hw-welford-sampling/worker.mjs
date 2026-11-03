import {simulate} from './core.mjs';
self.onmessage = ({data:{ns,m,seed}}) => {
  try { self.postMessage({result:simulate(ns,m,seed,progress=>self.postMessage({progress}))}); }
  catch(error) {self.postMessage({error:error.message});}
};
