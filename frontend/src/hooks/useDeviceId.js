import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

const KEY = "device_id";

function randomId() {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let id = await SecureStore.getItemAsync(KEY);
        if (!id) {
          id = randomId();
          await SecureStore.setItemAsync(KEY, id);
        }
        setDeviceId(id);
      } catch {
        setDeviceId("anon");
      }
    })();
  }, []);

  return deviceId;
}
