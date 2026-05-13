import { useEffect } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "/";

export const useSocket = (handlers = {}) => {
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    Object.entries(handlers).forEach(([event, handler]) => {
      if (typeof handler === "function") {
        socket.on(event, handler);
      }
    });

    return () => socket.disconnect();
  }, [handlers]);
};
