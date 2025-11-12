import { useState, useEffect, useCallback } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number; // milliseconds per word
  onComplete?: () => void;
}

export function useTypewriter({ text, speed = 50, onComplete }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Skip to end function
  const skip = useCallback(() => {
    setDisplayedText(text);
    setIsComplete(true);
    onComplete?.();
  }, [text, onComplete]);

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
        onComplete?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return { displayedText, isComplete, skip };
}
