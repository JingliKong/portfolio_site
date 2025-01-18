var cloth;
var GRAVITY;
const PARTICLES_PER_ROW = 16;
const PARTICLES_PER_COL = 16;
const SPACING = 13;
const SPHERE_RADIUS = 30;

// https://p5js.org/reference/#/p5/camera <---- this was my reference 
// camera controls 
var camX = 300;
var camY = -200;
var camZ = 300;
var dragging = false;
var lastX = 0;
var lastY = 0;
var rotX = 0;
var rotY = 0;
// camera position
var camPosX = 0;
var camPosY = 0;
var camPosZ = 0;

// Continuous key movement handling
var moveLeft = false;
var moveRight = false;
var moveUp = false;
var moveDown = false;
var zKeyPressed = false;


var clothTexture;

var windDirection;
var windForce = 0; 
var windSlider;

var TEAR_THRESHOLD = 2.5; 

function preload() {
  // clothTexture = loadImage('assets\\gto.jpg');
  clothTexture = loadImage('assets\\cloth_simulation\\gto2.webp');
}

function setup() {
  var canvas = createCanvas(600, 600, WEBGL);
  canvas.parent("cloth-sim");

  // initialize cloth object
  cloth = new Cloth(PARTICLES_PER_ROW, PARTICLES_PER_COL, SPACING);
  // initialize gravity
  GRAVITY = createVector(0, 0.1, 0);
  windDirection = createVector(0, 0, windForce);  // Example: wind blowing in positive X direction
  // making sure the image fits the cloth 
  clothTexture.resize(PARTICLES_PER_ROW * SPACING, PARTICLES_PER_COL * SPACING);
  windSlider = createSlider(0, 2.3, 0, 0.1); // starting at 0 increasing 0.1 at a time 
  // windForce = windSlider.value(); // redundent but idc
  
}

function draw() {
  print(windForce)
  background(47,79,79);
  noStroke();
  // every frame we update cloth
  cloth.update();
  // and display it
  cloth.display();
  // adding wind force 
  windForce = windSlider.value();
  
  cloth.applyWindForce(windDirection);
  // drawing sphere 
  push();
  fill(0);
  translate(0, 100, -30);
  sphere(SPHERE_RADIUS);
  pop();

  // based on slider updating wind speed 
  windDirection.z = windForce;
  
  //
  // camera(500, 0, -100, 20, 0, 0, 0, 1, 0);

  // update camera positioning 
  let radius = dist(0, 0, 0, camX, camY, camZ);
  // let radius = camRadius;
  camX = radius * sin(rotY) * cos(rotX);
  camY = radius * sin(rotX);
  camZ = radius * cos(rotY) * cos(rotX);

  camera(camX, camY, camZ, camPosX, camPosY, camPosZ, 0, 1, 0);
  let ROT_MOVE_SPEED = 15;
  // Continuous key movement handling
  if (moveLeft) camPosX -= ROT_MOVE_SPEED;
  if (moveRight) camPosX += ROT_MOVE_SPEED;
  if (moveUp) camPosY += ROT_MOVE_SPEED;
  if (moveDown) camPosY -= ROT_MOVE_SPEED;
}

// Represents the nodes which the cloth is made of 
class Particle {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    this.prevPos = this.pos.copy();
    this.acc = createVector(0, 0, 0); // only need acc because verlet integration implicitly stores velocity based on positions  
    this.mass = 1;
    this.radius = 5;
    this.fixed = false; // fixed particles are going to glue one side of the cloth to the ceiling 
  }
  applyForce(force) { // a = f / m 
    this.acc.add(p5.Vector.div(force, this.mass));
  }
  applyGravity() {
    this.applyForce(GRAVITY);
  }
  update() { // particles get moved about via the spring forces which are inacted by the springs holding everything together
    if (!this.fixed) { // if the particle is not fixed, then update its position 
      const DAMPING = 0.95; // dampening factor 
      let vel = p5.Vector.sub(this.pos, this.prevPos); // velocity = position - previous position 
      vel.mult(DAMPING); // dampen the velocity 
      this.prevPos = this.pos.copy(); // update the previous position 
      this.pos.add(vel); // add the velocity to the current position 
      this.pos.add(this.acc); // add the acceleration to the current position 
      this.acc.mult(0); // reset the acceleration 
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    sphere(this.radius);
    // ellipse(0, 0, this.radius, this.radius);
    pop();
  }

  checkCollisionWithSphere(center, radius) {
    let dir = p5.Vector.sub(this.pos, center);
    let d = dir.mag() + this.radius;

    // If inside the sphere
    if (d < radius) {
      let diff = radius - d;
      dir.normalize();
      dir.mult(diff);
      this.pos.add(dir);
    }
  }
  checkCollisionWithSphere(center, radius) {
    let dir = p5.Vector.sub(this.pos, center);
    let d = dir.mag();

    // If inside the sphere
    if (d < radius) {
      let diff = radius - d;
      dir.normalize();
      dir.mult(diff);
      this.pos.add(dir);
    }
  }
  isConnectedTo(spring) {
    return this === spring.p1 || this === spring.p2;
  }
}

class Spring { // holds particles together and applies spring force as constraint
  constructor(p1, p2, restLength) {
    this.p1 = p1; // particle 1
    this.p2 = p2; // particle 2
    this.restLength = restLength;
    this.k = 0.3; // stiffness
    this.broken = false; 
  }
  update() { // applying hookes law 
    if (this.fixed) {
      return;
    }
    // calculating the dist between points for vel 
    let relativeVelocity = p5.Vector.sub(this.p1.pos, this.p2.pos);
    let d = relativeVelocity.mag();
    // calculating the stretch 
    let stretch = d - this.restLength;
    // Adding damping to stop sim from exploding 
    let dampingForce = -1 * this.k * relativeVelocity;

    relativeVelocity.normalize();
    relativeVelocity.mult(-1 * this.k * stretch);
    relativeVelocity.add(dampingForce);

    this.p1.applyForce(relativeVelocity);
    relativeVelocity.mult(-1);
    this.p2.applyForce(relativeVelocity);

    //adding tearing for cloth if forces become too great 
    if (d > this.restLength * TEAR_THRESHOLD) {
      print("breaking");
      this.broken = true; 
    }
  }
  display() {
    // push();
    // fill(0);
    line(this.p1.pos.x, this.p1.pos.y, this.p1.pos.z, this.p2.pos.x, this.p2.pos.y, this.p2.pos.z);
    // pop();
  }
  getParticles() {
    return [this.p1, this.p2];
  }
}

class Cloth {
  constructor(rows = 10, cols = 10, spacing = 25) {
    // this.rows = rows; 
    // this.cols = cols;
    this.spacing = spacing;
    this.particles = [];
    this.springs = [];

    for (let i = 0; i < rows; i++) {
      this.particles[i] = [];
      for (let j = 0; j < cols; j++) {
        // Change the Particle coordinates to be on the x and z axes. So cloth just lands on sphere
        let p = new Particle(i * spacing - rows * spacing / 2, 0, j * spacing - cols * spacing / 2,);
        this.particles[i][j] = p;

        //draws the springs that are horizontal which gives hanging ropes 
        if (j > 0) {
          let spring = new Spring(p, this.particles[i][j - 1], spacing);
          this.springs.push(spring);
        }
        // horizontal connections 
        if (i > 0) {
          let spring = new Spring(p, this.particles[i - 1][j], spacing);
          this.springs.push(spring);
        }
      }
    }
    // creates the diagonal connections 
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // left to right diagonals 
        if (i < rows - 1 && j < cols - 1) {
          let spring = new Spring(this.particles[i][j], this.particles[i + 1][j + 1], Math.sqrt(2) * spacing);
          this.springs.push(spring);
        }
        // right to left diagonals
        if (i > 0 && j < cols - 1) {
          let spring = new Spring(this.particles[i][j], this.particles[i - 1][j + 1], Math.sqrt(2) * spacing);
          this.springs.push(spring);
        }
      }
    }
    // uncomment this for a falling cloth 
    for (let i = 0; i < cols; i++) {
      this.particles[i][0].fixed = true;
    }
  }

  update() {
    // any higher and it looks no good lol 
    const SUBSTEPS = 10;
    for (let i = 0; i < SUBSTEPS; i++) {
      for (let row of this.particles) {
        for (let p of row) {
         if (p != null) {
          p.applyGravity();
          p.update();
          p.checkCollisionWithSphere(createVector(0, 100, -25), SPHERE_RADIUS); // Check for collisions with the sphere
         }
        }
      }

      // any springs which are broken get removed from the springs list 
      // this.springs = this.springs.filter(spring => !spring.broken); 

      for (let spring of this.springs) {
        spring.update();
      }
    }
  }

  display() {
    // old display with shading 
    for (let spring of this.springs) {
      if (!spring.broken) {
        spring.display();
      }
    }
    for (let row of this.particles) {
      for (let p of row) {
        if (p != null) {
          p.display();
        }
      }
    }

    push();
    noFill();
    noStroke();
    // textureMode(NORMAL);
    texture(clothTexture);
    
    for (let i = 0; i < this.particles.length - 1; i++) {
      beginShape(TRIANGLE_STRIP);
      
        for (let j = 0; j < this.particles[i].length - 1; j++) {
            let p1 = this.particles[i][j];
            let p2 = this.particles[i][j + 1];
            let p3 = this.particles[i + 1][j + 1];
            let p4 = this.particles[i + 1][j];

            // Drawing a quad using the four particles
            beginShape();
            vertex(p1.pos.x, p1.pos.y, p1.pos.z, 0, 0); // Top-left corner of the texture
            vertex(p2.pos.x, p2.pos.y, p2.pos.z, 1, 0); // Top-right corner of the texture
            vertex(p3.pos.x, p3.pos.y, p3.pos.z, 1, 1); // Bottom-right corner of the texture
            vertex(p4.pos.x, p4.pos.y, p4.pos.z, 0, 1); // Bottom-left corner of the texture
            endShape(CLOSE);
        }
        endShape();
    }
    pop();
  }
  // takes in 3 vertexes and calculates the normal vector 
  calcTriangleNormal(p1, p2, p3) {
    let v1 = p5.Vector.sub(p2.pos, p1.pos);
    let v2 = p5.Vector.sub(p3.pos, p1.pos);

    return p5.Vector.cross(v1, v2);
  }

  // applying wind force to the cloth
  // recal F_d = 1/2 * p * v^2 * A * C_d * n
  /*
  p = density of air
  v = velocity of wind
  C_d = drag coefficient
  A = area of triangle = 1/2 the cross product 
   */
  // applying wind force to the cloth
  applyTriangleWindForce(p1, p2, p3, direction) {
    const rho = 1.3; // density of air 
    const CD = 0.1;  // drag coefficient
    
    let normal = this.calcTriangleNormal(p1, p2, p3);
    let normalizedNormal = p5.Vector.normalize(normal);

    // Effective wind velocity component perpendicular to the triangle's surface
    let windEffect = p5.Vector.dot(normalizedNormal, direction);

    // If windEffect is negative, we should flip the normalizedNormal
    if (windEffect < 0) {
        normalizedNormal.mult(-1);
        windEffect = -windEffect; // make windEffect positive since it's squared next
    }

    // Using half the magnitude of the normal as a simple way to calculate the triangle's area
    let A = normal.mag() * 0.5;
    
    let dragMagnitude = 0.5 * rho * windEffect * windEffect * CD * A;
    let dragForce = normalizedNormal.copy().mult(dragMagnitude);
    
    // Distributing the drag force equally among the triangle's vertices
    p1.applyForce(dragForce.div(3)); // Dividing force by 3 for each vertex
    p2.applyForce(dragForce.div(3));
    p3.applyForce(dragForce.div(3));    
}

  applyWindForce(direction) {
    for(let x = 0; x < PARTICLES_PER_ROW - 1; x++) {
      for(let y = 0; y < PARTICLES_PER_COL - 1; y++) {
        this.applyTriangleWindForce(this.particles[x+1][y], this.particles[x][y], this.particles[x][y+1], direction);
        this.applyTriangleWindForce(this.particles[x+1][y+1], this.particles[x+1][y], this.particles[x][y+1], direction);
      }
    }
  }
}

function mousePressed() {
  dragging = true;
  lastX = mouseX;
  lastY = mouseY;
}

function mouseReleased() {
  dragging = false;
}

function mouseDragged() {
  if (dragging && zKeyPressed) {
    let dx = mouseX - lastX;
    let dy = mouseY - lastY;
    rotY += dx * 0.005;
    rotX += dy * 0.005;
    lastX = mouseX;
    lastY = mouseY;
  }
}


function keyPressed() {

  switch (keyCode) {
    case 65:
      moveLeft = true;
      break;
    case 68: // d
      moveRight = true;
      break;
    case 87: // w 
      moveUp = true;
      break;
    case 83:
      moveDown = true;
      break;
    case 90:  // z key 
      zKeyPressed = true;
      break;
  }
}

function keyReleased() { 
  switch (keyCode) {
    case 65: // using wasd to move camera 
      moveLeft = false;
      break;
    case 68:
      moveRight = false;
      break;
    case 87:
      moveUp = false;
      break;
    case 83:
      moveDown = false;
      break;
    case 90: // z key  
      zKeyPressed = false;
      break;
  }
}