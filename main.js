import Timer from './Timer.js';

var stats = new Stats();
stats.showPanel( 0 );
document.body.appendChild( stats.dom );
stats.begin();

const divElement = document.getElementById("3d-graph");

const configOptions  = { 
  controlType: 'orbit', 
  rendererConfig: { antialias: true, alpha: true } 
};

let selectedNode = null

const Graph = ForceGraph3D(configOptions)(divElement)
  .enableNodeDrag(true)
  .onNodeHover(node => {divElement.style.cursor = node ? 'pointer' : null})
  .onNodeClick(onNodeClick)
  .linkVisibility(getLinkVisibility)
  .nodeThreeObject(nodeObject)
  .showNavInfo(true)
  .onEngineTick(() => {stats.end(); stats.begin();})
  
var GraphX = new jsnx.Graph()

class GraphSettings {
  constructor() {
    this.pathToData = './miserables.json';
    this.nodeShape = 'sphere';
    this.visibleLinks = true;
    // this.update = function () { Graph.refresh(); };
  }
}

var gui = new dat.GUI();

var f1 = gui.addFolder('General'); f1.open()
var graphSettings = new GraphSettings();
const possiblePaths = ['./miserables.json','./private/FacebookFriendsData.json']
f1.add(graphSettings,'pathToData',possiblePaths).onFinishChange(load);
f1.add(graphSettings,'nodeShape',['image','text','sphere']).onChange(Graph.refresh);
f1.add(graphSettings,'visibleLinks').onChange(Graph.refresh);

var graphStatistics = {
//  computeNodeCentrality: 
}
var f2 = gui.addFolder('Statistics')
//f2.add(graphStatistics,'computeNodeCentrality');

var style = {
  nodeColor: '#bbcc77',
  nodeSelectionColor: '#bb3333',
  linkColor: '#505050'
}
var f3 = gui.addFolder('Styling'); f3.open()
f3.addColor(style, 'nodeColor').onFinishChange(Graph.refresh)
f3.addColor(style, 'nodeSelectionColor').onFinishChange(Graph.refresh)
f3.addColor(style, 'linkColor').onFinishChange(Graph.refresh)

load(graphSettings.pathToData)

const mapFriendsToNodes = data => ({nodes: data.friends, ...data})

function load(path) {
  return fetch(path)
    .then(response => response.json())
    .then(data => {
      if (data.nodes && data.links) return data
      if (data.friends && data.links) return mapFriendsToNodes(data)
      return {nodes: [], links: []}
    })
    .then(data => {
      let edges = data.links.map(l => {return [l.source, l.target]})
      GraphX.addEdgesFrom(edges)
      console.log(GraphX)
      return data
    })
    .then(Graph.graphData)
}

function onNodeClick(node) {
  selectNode(node)
  console.log(node)
  // Graph.refresh()
  Graph
    .linkVisibility(getLinkVisibility)
    .nodeThreeObject(nodeObject)
}

function getLinkVisibility(link, index) {
  if (graphSettings.visibleLinks) {
    if (selectedNode)
      return link.source.id === selectedNode.id || link.target.id === selectedNode.id
    return true
  }
  return false
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
  } else {
    selectedNode = node;
  }
}

function nodeObject(node) {
  switch (graphSettings.nodeShape) {
    case 'image': return createImageObject(node)
    case 'text': return createTextObject(node)
    default: return createSphereObject(node)
  }
}

function createSphereObject(node) {
  let color = (selectedNode && node.id === selectedNode.id) 
  ? style.nodeSelectionColor 
  : style.nodeColor;

  return new THREE.Mesh(
    new THREE.SphereGeometry(7),
    new THREE.MeshLambertMaterial({
      color,
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
  let imgTexture = 
  (imageUri) ? new THREE.TextureLoader().load(imageUri) :
  (imageUrl) ? new THREE.TextureLoader().load(imageUrl) : 
  null;

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
  let sprite = (node.name) ? new SpriteText(node.name) : new SpriteText(node.id);
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