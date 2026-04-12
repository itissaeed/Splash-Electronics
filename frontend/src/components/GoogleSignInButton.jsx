import React, { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID?.trim();

export default function GoogleSignInButton({ onSuccess, onError, disabled = false }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id || !buttonRef.current) {
      return undefined;
    }

    let cancelled = false;

    const handleCredential = async (response) => {
      try {
        await onSuccess?.(response?.credential);
      } catch (error) {
        onError?.(error);
      }
    };

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 320,
    });

    if (!cancelled) {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, [onError, onSuccess]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs text-amber-700">
        Google sign-in is unavailable until `REACT_APP_GOOGLE_CLIENT_ID` is configured.
      </p>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <div ref={buttonRef} className="flex justify-center" />
      {!ready && (
        <div className="rounded-xl border border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
          Loading Google sign-in...
        </div>
      )}
    </div>
  );
}
