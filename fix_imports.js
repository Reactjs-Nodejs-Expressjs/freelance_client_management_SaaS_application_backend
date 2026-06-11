const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function walk(dir, callback) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      walk(filePath, callback);
    } else {
      callback(filePath);
    }
  });
}

const replacements = [
  // node_modules imports
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/react_jsx-dev-runtime\.js\?[^'"]+['"]/g, replacement: 'from "react/jsx-runtime"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/react-dom_client\.js\?[^'"]+['"]/g, replacement: 'from "react-dom/client"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/@tanstack_react-query\.js\?[^'"]+['"]/g, replacement: 'from "@tanstack/react-query"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/lucide-react\.js\?[^'"]+['"]/g, replacement: 'from "lucide-react"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/recharts\.js\?[^'"]+['"]/g, replacement: 'from "recharts"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/wouter\.js\?[^'"]+['"]/g, replacement: 'from "wouter"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/framer-motion\.js\?[^'"]+['"]/g, replacement: 'from "framer-motion"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/clsx\.js\?[^'"]+['"]/g, replacement: 'from "clsx"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/tailwind-merge\.js\?[^'"]+['"]/g, replacement: 'from "tailwind-merge"' },
  { regex: /from\s+['"]\/node_modules\/\.vite\/deps\/react\.js\?[^'"]+['"]/g, replacement: 'from "react"' },
  
  // Relative src paths
  { regex: /from\s+['"]\/src\/lib\/api\.ts['"]/g, replacement: 'from "@/lib/api"' },
  { regex: /from\s+['"]\/src\/lib\/api['"]/g, replacement: 'from "@/lib/api"' },
  { regex: /from\s+['"]\/src\/hooks\/useAuth\.ts['"]/g, replacement: 'from "@/hooks/useAuth"' },
  { regex: /from\s+['"]\/src\/hooks\/useAuth['"]/g, replacement: 'from "@/hooks/useAuth"' },
  { regex: /from\s+['"]\/src\/hooks\/useNotifications\.ts['"]/g, replacement: 'from "@/hooks/useNotifications"' },
  { regex: /from\s+['"]\/src\/hooks\/useNotifications['"]/g, replacement: 'from "@/hooks/useNotifications"' },
  
  // General absolute /src/ imports -> @/
  { regex: /from\s+['"]\/src\/([^'"]+)['"]/g, replacement: 'from "@/$1"' },
  
  // Strip .ts / .tsx extensions in imports if any
  { regex: /from\s+['"](@\/[^'"]+)\.tsx?['"]/g, replacement: 'from "$1"' },
  
  // Replit API workspace client resolver imports if any
  { regex: /from\s+['"]\/@fs\/home\/runner\/workspace\/lib\/api-client-react\/src\/index\.ts['"]/g, replacement: 'from "@tanstack/react-query"' }
];

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${path.relative(__dirname, filePath)}`);
  }
});

console.log('Finished fixing imports!');
