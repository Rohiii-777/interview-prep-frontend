import axios from "axios";
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// import axios from "axios";
// export const api = axios.create({
//   baseURL: "http://127.0.0.1:8000",
// });