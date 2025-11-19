import React, { createContext, useState, useEffect } from "react";

// Create context
export const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // store token too

  // Load user and token from localStorage on app start
  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  // Login helper
  const login = (userData, jwtToken) => {
    localStorage.setItem("userInfo", JSON.stringify(userData));
    localStorage.setItem("token", jwtToken);
    setUser(userData);
    setToken(jwtToken);
  };

  // Logout helper
  const logout = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  return (
    <UserContext.Provider value={{ user, token, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
