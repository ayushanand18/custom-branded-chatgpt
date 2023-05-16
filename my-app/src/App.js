import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import Login from "./components/auth/login";
import Signup from "./components/auth/signup";
import NotFound from "./components/notfound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" index element={<Home />}>
        <Route path="auth/login" element={<Login />} />
        <Route path="auth/signup" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
