import Timer from './Timer.js';

var stats = new Stats();
stats.showPanel( 0 );
document.body.appendChild( stats.dom );
stats.begin();

const divElement = document.getElementById("3d-graph");

const distance = 500;

const configOptions  = { 
  controlType: 'orbit', 
  rendererConfig: { antialias: true, alpha: true } 
};

let selectedNode = null

// const Graph = ForceGraph(configOptions)(divElement)
const Graph = ForceGraph3D(configOptions)(divElement)
  .enableNodeDrag(true)
  .onNodeHover(node => {divElement.style.cursor = node ? 'pointer' : null})
  // .onNodeClick(removeNode)
  .onNodeClick(selectNode)
  // .nodeThreeObject(createImageObject)
  .nodeThreeObject(nodeObject)
  .cameraPosition({ z: distance })
  .showNavInfo(true)
  .onEngineTick(() => {stats.end(); stats.begin();})

class GraphSettings {
  constructor() {
    this.pathToData = './miserables.json';
    this.nodeShape = 'sphere';
    this.update = function () { Graph.refresh(); };
  }
}

var graphSettings = new GraphSettings();
var gui = new dat.GUI();
const possiblePaths = ['./miserables.json','./private/FacebookFriendsData.json']
gui.add(graphSettings,'pathToData',possiblePaths).onFinishChange(load);
gui.add(graphSettings,'nodeShape',['image','text','sphere']).onFinishChange(Graph.refresh);
gui.add(graphSettings,'update');

load(graphSettings.pathToData)

const mapFriendsToNodes = ({friends, links}) => ({nodes: friends, links})

function load(path) {
  return fetch(path)
    .then(response => response.json())
    .then(data => {
      if (data.nodes) return data
      if (data.friends) return mapFriendsToNodes(data)
      return {nodes: [], links: []}
    })
    .then(Graph.graphData)
}

function removeNode(node) {
  let { nodes, links } = Graph.graphData();
  links = links.filter(l => l.source !== node && l.target !== node); // Remove links attached to node
  nodes.splice(node.id, 1); // Remove node
  nodes.forEach((n, idx) => n.id = idx); // Reset node ids to array index
  Graph.graphData({ nodes, links });
}

function selectNode(node) {
  if (selectedNode && selectedNode.id === node.id) {
    selectedNode = null;
    load(graphSettings.pathToData)
  } else if (selectedNode === null) {
    selectedNode = node;
    let { nodes, links } = Graph.graphData();
    let updatedLinks = links.filter(l => l.source.id === selectedNode.id || l.target.id === selectedNode.id);

    let nodeIds = updatedLinks.map(l => l.source.id === selectedNode.id ? l.target.id : l.source.id);
    nodeIds = [...nodeIds, selectedNode.id];
    let updatedNodes = nodes.filter(n => nodeIds.includes(n.id));

    Graph.graphData({ nodes: updatedNodes, links: updatedLinks });
  } else {
    selectedNode = node;
    load(graphSettings.pathToData)
    let { nodes, links } = Graph.graphData();
    let updatedLinks = links.filter(l => l.source.id === selectedNode.id || l.target.id === selectedNode.id);

    let nodeIds = updatedLinks.map(l => l.source.id === selectedNode.id ? l.target.id : l.source.id);
    nodeIds = [...nodeIds, selectedNode.id];
    let updatedNodes = nodes.filter(n => nodeIds.includes(n.id));

    Graph.graphData({ nodes: updatedNodes, links: updatedLinks });
  }
}

function nodeObject(node) {
  switch (graphSettings.nodeShape) {
    case 'image': return createImageObject(node)
    case 'text': return createTextObject(node)
    default: return createSphereObject()
  }
}

function createSphereObject() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(7),
    new THREE.MeshLambertMaterial({
      color: '#b3c471',
      transparent: true,
      opacity: 0.75
    })
  );
}

function createImageObject({ imageUri, imageUrl }) {
  // use a sphere as a drag handle
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(7),
    new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true, opacity: 0 })
  );
  // add img sprite as child
  let imgTexture
  if (imageUri)
    imgTexture = new THREE.TextureLoader().load(imageUri);
  else if (imageUrl) {
    imgTexture = new THREE.TextureLoader().load(imageUrl);    
  }
  const material = new THREE.SpriteMaterial({ map: imgTexture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(12, 12);
  obj.add(sprite);
  return obj;
}

function createTextObject(node) {
  // use a sphere as a drag handle
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(10),
    new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true, opacity: 0 })
  );
  // add text sprite as child
  let sprite
  if (node.name) {
    sprite = new SpriteText(node.name);
  } else {
    sprite = new SpriteText(node.id);
  }
  // sprite.color = node.color;
  sprite.textHeight = 8;
  obj.add(sprite);
  return obj;
}

function removeUnconnectedNodes(graphData) {
  graphData.nodes = graphData.nodes.filter(node => hasLinks(node.id, graphData.links))
  return graphData;
}

function hasLinks(nodeId, links) {
  for (var i = 0; i < links.length; i++) {
    if (links[i].source.id === nodeId || links[i].target.id === nodeId) {
      return true;
    }
  }
  return false;
}