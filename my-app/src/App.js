import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import Login from "./components/auth/login";
import Signup from "./components/auth/signup";
import NotFound from "./components/notfound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/auth/login" element={<Login />} />
        <Route exact path="/auth/signup" element={<Signup />} />
        <Route exact path="/404" element={<NotFound />}/>
        <Route exact path="*" element={<Navigate to="/404" />} />
        <Route exact path="/" element={<Home />}>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
