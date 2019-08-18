// import ForceGraph3D from '3d-force-graph';
import Timer from './Timer.js';

const divElement = document.getElementById("3d-graph");

const distance = 500;

const configOptions  = { 
  controlType: 'orbit', 
  rendererConfig: { antialias: true, alpha: true } 
};

const Graph = ForceGraph3D(configOptions)(divElement)
  .enableNodeDrag(true)
  .onNodeHover(node => divElement.style.cursor = node ? 'pointer' : null)
  // .onNodeClick(removeNode)
  .nodeThreeObject(createImageObject)
  .cameraPosition({ z: distance })
  .showNavInfo(true)

let angle = 0;
const timer = new Timer(1 / 60);
timer.update = (deltaTime) => {
  Graph.cameraPosition({
    x: distance * Math.sin(angle),
    z: distance * Math.cos(angle)
  });
  angle += Math.PI * deltaTime / 10;
}
timer.start();

fetch('./miserables.json')
  .then(response => response.json())
  .then(removeUnconnectedNodes)
  .then(Graph.graphData)
  .catch(console.error)

function removeNode(node) {
  let { nodes, links } = Graph.graphData();
  links = links.filter(l => l.source !== node && l.target !== node); // Remove links attached to node
  nodes.splice(node.id, 1); // Remove node
  nodes.forEach((n, idx) => n.id = idx); // Reset node ids to array index
  Graph.graphData({ nodes, links });
}

// function createImageObject(node) { // ({ img })
function createImageObject({ dataUrl }) { // node: {dataUrl: ...}
  // use a sphere as a drag handle
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(7),
    new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true, opacity: 0 })
  );
  // add img sprite as child
  const imgTexture = new THREE.TextureLoader().load(dataUrl); // `./imgs/${img}`
  const material = new THREE.SpriteMaterial({ map: imgTexture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(12, 12);
  obj.add(sprite);
  return obj;
}

function removeUnconnectedNodes(graphData) {
  graphData.nodes = graphData.nodes.filter(node => hasLinks(node.id, graphData.links))
  return graphData;
}

function hasLinks(nodeId, links) {
  for (var i = 0; i < links.length; i++) {
    if (links[i].source == nodeId || links[i].target == nodeId) {
      return true;
    }
  }
  return false;
}