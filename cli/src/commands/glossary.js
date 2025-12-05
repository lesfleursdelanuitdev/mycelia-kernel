/**
 * Glossary Command
 * Display definitions for Mycelia Kernel terms
 */

import { getTerm, getAllTerms, searchTerms, getTermsByCategory } from '../data/glossary.js';

function formatDefinition(entry) {
  let output = `\n${entry.term}\n`;
  output += '━'.repeat(80) + '\n';
  output += `Category: ${entry.category}\n\n`;
  output += `Definition:\n  ${entry.definition}\n\n`;
  
  if (entry.characteristics && entry.characteristics.length > 0) {
    output += `Characteristics:\n`;
    for (const char of entry.characteristics) {
      output += `  • ${char}\n`;
    }
    output += '\n';
  }
  
  if (entry.related && entry.related.length > 0) {
    output += `Related Terms: ${entry.related.join(', ')}\n\n`;
  }
  
  if (entry.example) {
    output += `Example:\n  ${entry.example}\n\n`;
  }
  
  return output;
}

export function glossaryCommand(part) {
  if (!part) {
    console.log('Mycelia Kernel Glossary\n');
    console.log('Usage: mycelia-kernel glossary <term>');
    console.log('       mycelia-kernel glossary list');
    console.log('       mycelia-kernel glossary search <query>\n');
    console.log('Available terms:');
    const terms = getAllTerms();
    const categories = {};
    
    for (const term of terms) {
      const entry = getTerm(term);
      if (entry) {
        if (!categories[entry.category]) {
          categories[entry.category] = [];
        }
        categories[entry.category].push(entry.term);
      }
    }
    
    for (const [category, termList] of Object.entries(categories)) {
      console.log(`\n${category}:`);
      termList.sort().forEach(term => {
        console.log(`  • ${term}`);
      });
    }
    console.log('\n');
    return;
  }
  
  const lowerPart = part.toLowerCase();
  
  // Handle special commands
  if (lowerPart === 'list') {
    console.log('Mycelia Kernel Glossary - All Terms\n');
    const terms = getAllTerms();
    const entries = terms.map(t => getTerm(t)).filter(Boolean).sort((a, b) => {
      // Sort by category, then by term name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.term.localeCompare(b.term);
    });
    
    let currentCategory = '';
    for (const entry of entries) {
      if (entry.category !== currentCategory) {
        if (currentCategory) console.log('');
        console.log(`${entry.category}:`);
        currentCategory = entry.category;
      }
      console.log(`  • ${entry.term}`);
    }
    console.log('\n');
    return;
  }
  
  if (lowerPart === 'search') {
    console.log('Usage: mycelia-kernel glossary search <query>\n');
    return;
  }
  
  if (lowerPart.startsWith('search ')) {
    const query = lowerPart.substring(7);
    const results = searchTerms(query);
    
    if (results.length === 0) {
      console.log(`No terms found matching "${query}"\n`);
      return;
    }
    
    console.log(`Search results for "${query}" (${results.length} found):\n`);
    for (const entry of results) {
      console.log(formatDefinition(entry));
    }
    return;
  }
  
  // Get specific term
  const entry = getTerm(part);
  
  if (!entry) {
    console.log(`Term "${part}" not found in glossary.\n`);
    console.log('Use "mycelia-kernel glossary list" to see all available terms.');
    console.log('Use "mycelia-kernel glossary search <query>" to search.\n');
    return;
  }
  
  console.log(formatDefinition(entry));
}


