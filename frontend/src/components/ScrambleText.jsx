import { useState, useEffect, useRef, useCallback } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-#";

function rand(len) {
  let r = "";
  for (let i = 0; i < len; i++) r += CHARS[Math.floor(Math.random() * CHARS.length)];
  return r;
}

export default function ScrambleText({
  text,
  trigger = "mount",
  delay = 0,
  speed = 30,
  className = "",
  as: Tag = "span",
  ...rest
}) {
  const [prefix, setPrefix] = useState(trigger === "mount" ? "" : text);
  const [ghost, setGhost] = useState(() =>
    trigger === "mount" && text ? rand(text.length) : ""
  );
  const iv = useRef(null);
  const ran = useRef(false);

  const scramble = useCallback(() => {
    let pos = 0;
    setPrefix("");
    setGhost(rand(text.length));
    if (iv.current) clearInterval(iv.current);
    iv.current = setInterval(() => {
      if (pos >= text.length) {
        clearInterval(iv.current);
        iv.current = null;
        setPrefix(text);
        setGhost("");
        return;
      }
      pos++;
      setPrefix(text.substring(0, pos));
      setGhost(rand(text.length - pos));
    }, speed);
  }, [text, speed]);

  useEffect(() => {
    if (trigger === "mount" && !ran.current) {
      ran.current = true;
      const t = setTimeout(scramble, delay);
      return () => {
        clearTimeout(t);
        if (iv.current) clearInterval(iv.current);
      };
    }
  }, [trigger, delay, scramble]);

  useEffect(() => () => {
    if (iv.current) clearInterval(iv.current);
  }, []);

  if (!text) return <Tag className={className} {...rest} />;

  return (
    <Tag
      className={className}
      onMouseEnter={trigger === "hover" ? scramble : undefined}
      {...rest}
    >
      {prefix}
      {ghost && <span className="opacity-30">{ghost}</span>}
    </Tag>
  );
}
