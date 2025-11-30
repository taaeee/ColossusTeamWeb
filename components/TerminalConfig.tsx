import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "@/components/ui/terminal";

export function TerminalConfig() {
  return (
    <Terminal>
      <TypingAnimation delay={0}>
        alias load_fonts "mat_setvideomode 1920 1080 1; mat_setvideomode 1920
        1080 0"
      </TypingAnimation>
      <TypingAnimation delay={0}>load_fonts</TypingAnimation>
      <AnimatedSpan delay={800} className="text-red-500">
        Change 1920 1080 to your desired resolution if needed
      </AnimatedSpan>
    </Terminal>
  );
}
