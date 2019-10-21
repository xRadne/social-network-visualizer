node = {name:"alex",id:"3"}
selectedNode = node;
console.log(node)

let nodes = [{id:"1"}, {id:"2"}, {id:"3"}]
let links = [{source:"1",target:"2"},{source:"1",target:"3"}]
console.log(links)
const f = l => l.source === selectedNode.id || l.target === selectedNode.id
let updatedLinks = links.filter(f);
console.log(updatedLinks)

let nodeIds = updatedLinks.map(l => l.source === selectedNode.id ? l.target : l.source);
nodeIds = [...nodeIds, selectedNode.id];
let updatedNodes = nodes.filter(n => nodeIds.includes(n.id));
console.log(updatedNodes)

