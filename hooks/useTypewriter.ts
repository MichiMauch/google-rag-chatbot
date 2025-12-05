import { useState, useEffect, useCallback, useRef } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // milliseconds per word
  onComplete?: () => void;
}

export function useTypewriter({ text, speed = 50, onComplete }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Store callback in ref to avoid dependency issues
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Skip to end function
  const skip = useCallback(() => {
    setDisplayedText(text);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [text]);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsComplete(false);
      return;
    }

    // Split text into words
    const words = text.split(" ");
    let currentIndex = 0;

    setDisplayedText("");
    setIsComplete(false);

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText((prev) => {
          const newText = currentIndex === 0
            ? words[currentIndex]
            : prev + " " + words[currentIndex];
          return newText;
        });
        currentIndex++;
      } else {
        setIsComplete(true);
        onCompleteRef.current?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]); // onComplete NOT in dependencies - stored in ref

  return { displayedText, isComplete, skip };
}
