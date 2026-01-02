import NetshortAPI from './netshort-api.js';

const api = new NetshortAPI();
const loginRes = await api.login();
console.log(loginRes);