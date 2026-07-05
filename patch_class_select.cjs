const fs = require('fs');
let content = fs.readFileSync('src/components/StudentQuery.tsx', 'utf-8');

const anchor = `  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!searchClass || !availableClasses.includes(searchClass)) {
        setSearchClass(availableClasses[0]);
      }
      if (!scoreboardClass || (scoreboardClass !== "all" && !availableClasses.includes(scoreboardClass))) {
        setScoreboardClass("all");
      }
    } else {
      setSearchClass("");
      if (!scoreboardClass || scoreboardClass !== "all") {
        setScoreboardClass("all");
      }
    }
  }, [availableClasses]);`;

const replacement = `  useEffect(() => {
    if (availableClasses.length > 0) {
      if (searchClass && !availableClasses.includes(searchClass)) {
        setSearchClass("");
      }
      if (!scoreboardClass || (scoreboardClass !== "all" && !availableClasses.includes(scoreboardClass))) {
        setScoreboardClass("all");
      }
    } else {
      setSearchClass("");
      if (!scoreboardClass || scoreboardClass !== "all") {
        setScoreboardClass("all");
      }
    }
  }, [availableClasses]);`;

if (content.includes(anchor)) {
    content = content.replace(anchor, replacement);
    fs.writeFileSync('src/components/StudentQuery.tsx', content);
    console.log("Patched successfully.");
} else {
    console.log("Anchor not found. Let's check without spaces.");
}
