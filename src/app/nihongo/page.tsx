import Game from "./components/Game";
import { HighlightProvider } from "./highlight-context";

export const metadata = {
  title: "日本語練習 - Nihongo Practice",
  description: "Practice Japanese through interactive conversations",
};

export default function NihongoPage() {
  return (
    <HighlightProvider>
      <Game />
    </HighlightProvider>
  );
}
