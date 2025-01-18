var gravity;
var balls = [];
var numBalls = 4;
var score = 0;

var earth;
var jupiter;
var venus;

var gotHit;

var flippers = [];
var circleObstacles = [];
var lineSegments = [];

var hitsound;

var particles = [];

// plunger information
var plungerHeight;  // Maximum extended height
var plungerY; // Y-position of the plunger's top
var plungerCompression = 0; // Current compression amount
var plungerColor = [255, 0, 0];
var plungerWidth = 50;
var flipperCharged = false;

var backgroundImg;

function preload() {
  earth = loadImage('assets\\pinball\\images\\earth.png');
  venus = loadImage('assets\\pinball\\images\\planet2.png');
  jupiter = loadImage('assets\\pinball\\images\\jup.png');
  gotHit = loadImage('assets\\pinball\\images\\explosion.png');
  hitsound = loadSound('assets\\pinball\\sounds\\thunder.mp3');
  backgroundImg = loadImage('assets\\pinball\\images\\starry_sky.jpg');
}
function genBalls() {
  let ballSize = 20;
  // adding ball on plunger 
  balls.push(new Ball(createVector(width - 4, 600), createVector(0, 0), ballSize, 20, 1));
  for (let i = 0; i < numBalls; i++) {
    let x = random(width - plungerWidth - 130); // Random x coordinate within the canvas width
    // let x = 40;
    let y = 0; // y coordinate set to 0
    balls.push(new Ball(createVector(x, y), createVector(0, 0), ballSize, 20, 1));
  }

}
function setup() {
  var canvas = createCanvas(400, 800);

  canvas.parent("pinball_game");
  gravity = createVector(0, 300);
  genBalls();
  // setting up plunger 
  plungerHeight = 200;  // Maximum extended height
  plungerY = height - 100;



  // creating circular obstacles 

  circleObstacles.push(new CircleObstacle(createVector(200, 400), 50, 2));

  // Obstacle forming the upper left arm of the V
  circleObstacles.push(new CircleObstacle(createVector(100, 300), 50, 1.0));

  // Obstacle forming the upper right arm of the V
  circleObstacles.push(new CircleObstacle(createVector(250, 150), 50, 1.0));

  var radius = 10;
  var length = 100;
  var maxRotation = 1.0;
  var restAngle = 0.5;
  var angularVelocity = 10.0;
  var restitution = 1;



  // Define the positions using createVector()
  var pos1 = createVector(50, 600);
  var pos2 = createVector(300, 600);

  // Push new Flipper objects into the flippers array
  flippers.push(
    new Flipper(pos1, radius, length,
      -restAngle, maxRotation, angularVelocity, restitution)
  );
  // recall the flippper moves based on the sign of maxRotation
  flippers.push(
    new Flipper(pos2, radius, length,
      PI + restAngle, maxRotation, angularVelocity, restitution)
  );
  let leftLine = new LineSegment(createVector(0, 500), createVector(50, 600));
  let rightLine = new LineSegment(createVector(300, 600), createVector(350, 450));
  lineSegments.push(leftLine);
  lineSegments.push(rightLine);
  // line segment to close the right side 
  lineSegments.push(new LineSegment(createVector(350, 450), createVector(350, 200)));
  // line segment to close the map
  lineSegments.push(new LineSegment(createVector(350, 450), createVector(350, height)));
  // adding line segment that is at the top right diagonal 
  lineSegments.push(new LineSegment(createVector(width - 100, 0), createVector(width, 100)));
  // lineSegments.push(new LineSegment(createVector(0, 700), createVector(width, 700)));
}




function draw() {
  background(0);
  image(backgroundImg, 0, 0, width, height);
  noStroke();
  push();
  fill(204, 85, 0);
  textSize(32);
  textAlign(LEFT, TOP);
  // displaying score
  text("Score: " + score, 10, 10);  // 10 pixels from the right edge
  pop();

  // Smallet stepsizes has better collision detection 
  let dt = min(1 / 60, 1 / frameRate());  
  let substeps = 4; 
  let subDt = dt / substeps;

  for (let s = 0; s < substeps; s++) {
    runSim(subDt); 
  }

  // drawing plunger
  push();
  fill(plungerColor);
  rect(width - 50, plungerY - plungerCompression, plungerWidth, plungerHeight + plungerCompression);
  pop();
  // drawing obstacles 
  for (let i = 0; i < circleObstacles.length; i++) {
    let obstacle = circleObstacles[i];
    // circle(obstacle.pos.x, obstacle.pos.y, 2 * obstacle.radius);
    let imgToDraw;
    if (!obstacle.hit) {
      if (i === 1) {
        imgToDraw = earth;
      }
      else if (i === 2) {
        imgToDraw = venus;
      }
      else {
        imgToDraw = jupiter;
      }
    }
    else { // obstacle is hit 
      imgToDraw = gotHit;
    }

    image(imgToDraw, obstacle.pos.x - obstacle.radius, obstacle.pos.y - obstacle.radius, 2 * obstacle.radius, 2 * obstacle.radius);
  }
  // drawing linesegment 
  for (let i = 0; i < lineSegments.length; i++) {
    lineSegments[i].display();
  }

  // drawing flippers
  for (let i = 0; i < flippers.length; i++) {
    let flipper = flippers[i];

    flipper.move(dt);
    push(); // Save the current drawing state

    translate(flipper.pos.x, flipper.pos.y); // Use flipper position directly
    rotate(-flipper.restAngle - flipper.sign * flipper.rotation);

    rect(0.0, -flipper.radius,
      flipper.length, 2.0 * flipper.radius);
    circle(0, 0, 2 * flipper.radius);
    circle(flipper.length, 0, 2 * flipper.radius);

    pop(); // Restore the drawing state
  }
  // drawing balls 

  for (let i = 0; i < balls.length; i++) {
    // if (balls[i].pos.y > 680 && balls[i].pos.x < width - 50) {
    //   // balls[i].pos.y = 0;
    //   balls = [];
    //   genBalls();
    //   score = 0;
    // } 
    circle(balls[i].pos.x, balls[i].pos.y, 2 * balls[i].radius);
  }

  // drawSprites();


}

function runSim(dt) {
  // moving flippers
  for (let i = 0; i < flippers.length; i++) {
    flippers[i].move(dt);
  }

  // handling all ball collisions 
  for (let i = 0; i < balls.length; i++) {
    let currentBall = balls[i];
    // moving balls 
    currentBall.move(dt);
    handlePlungerCollision(currentBall);
    // circle(balls[i].pos.x, balls[i].pos.y, 2 * balls[i].radius);
    for (let j = 0; j < lineSegments.length; j++) {
      handleBallLineSegmentCollision(lineSegments[j], currentBall);
    }
    // ball circle obstacle collisions
    for (let j = 0; j < circleObstacles.length; j++) {
      handleBallCircleObstacleCollision(currentBall, circleObstacles[j]);
    }
    for (let i = 0; i < circleObstacles.length; i++) {
      if (circleObstacles[i].hit) {
        setTimeout(() => {
          circleObstacles[i].hit = false;
        }, 2000);
      }
    }

    // ball flipper collisions 
    for (let j = 0; j < flippers.length; j++) {
      handleBallFlipperCollision(currentBall, flippers[j]);
    }
    // ball ball collisions
    for (let j = i + 1; j < balls.length; j++) {
      ballToBallCollision(currentBall, balls[j], 1.0)
    }



    handleBallBorderCollision(currentBall);
  }
}

class Ball {
  constructor(pos, vel, radius, mass, restitution) {
    this.radius = radius;
    this.mass = mass;
    this.restitution = restitution;
    this.pos = pos.copy();
    this.vel = vel.copy();
    this.MAX_VELOCITY = 700;
  }

  move(dt) {
    let gravityScaled = createVector(gravity.x * dt, gravity.y * dt);
    this.vel.add(gravityScaled);

    // Cap the velocity
    if (this.vel.mag() > this.MAX_VELOCITY) {
      this.vel.normalize();
      this.vel.mult(this.MAX_VELOCITY);
    }

    let velScaled = createVector(this.vel.x * dt, this.vel.y * dt);
    this.pos.add(velScaled);
  }
}

class CircleObstacle {
  constructor(pos, radius, cor) {
    this.radius = radius;
    this.pos = pos.copy();
    this.cor = cor;
    this.hit = false;
  }
}
class LineSegment {
  constructor(start, end, color = [255, 255, 255], thickness = 1) {

    this.start = createVector(start.x, start.y);
    this.end = createVector(end.x, end.y);

    this.color = color;
    this.thickness = thickness;
  }

  display() {
    push();
    stroke(this.color);
    strokeWeight(this.thickness);
    line(this.start.x, this.start.y, this.end.x, this.end.y);
    pop();
  }
}


class Flipper {
  constructor(pos, radius, length, restAngle, maxRotation, angularVel) {

    this.pos = pos.copy();
    this.radius = radius
    this.length = length;
    this.restAngle = restAngle;
    this.maxRotation = maxRotation;
    this.angularVel = angularVel;
    this.sign = Math.sign(maxRotation);
    this.rotation = 0.0;
    this.currentAngleVelocity = 0.0;
    this.moving = -1;
  }
  move(dt) {
    var l_moving = this.moving;
    var prevRotation = this.rotation;

    if (l_moving === 1) {
      this.rotation = Math.min(this.rotation + dt * this.angularVel, this.maxRotation);
    }
    else if (l_moving === 2) {
      this.rotation = Math.max(this.rotation - dt * this.angularVel, -this.maxRotation);
    }
    else {
      this.rotation = Math.max(this.rotation - dt * this.angularVel, 0.0);
      this.currentAngularVelocity = this.sign * (this.rotation - prevRotation) / dt;
    }

    this.currentAngleVelocity = this.sign * (this.rotation - prevRotation) / dt;

  }
  getTip() {
    let angle = -1 * this.restAngle + -1 * this.sign * this.rotation;
    let dir = createVector(Math.cos(angle), Math.sin(angle));
    dir.mult(this.length);
    let tip = this.pos.copy().add(dir);
    return tip;
  }

}


function handleBallLineSegmentCollision(line, ball) {
  let max_t = 9999999;
  let l_start = line.start;
  let l_end = line.end;

  let distStart = p5.Vector.dist(l_start, ball.pos);
  let distEnd = p5.Vector.dist(l_end, ball.pos);

  if ((distStart) < ball.radius || (distEnd) < ball.radius) {
    // Compute normal from closest point and reflect
    let normal;
    if (distStart < distEnd) {
      normal = p5.Vector.sub(ball.pos, l_start).normalize();
    } else {
      normal = p5.Vector.sub(ball.pos, l_end).normalize();
    }
    ball.vel = reflect(ball.vel, normal);
    return true;
  }

  let l_dir = p5.Vector.sub(l_end, l_start);
  let l_dir_norm = l_dir.copy().normalize();
  let l_len = l_dir.mag();

  let toCircle = p5.Vector.sub(ball.pos, l_start);

  let a = 1;
  let b = -2 * p5.Vector.dot(l_dir_norm, toCircle);
  let c = toCircle.magSq() - (ball.radius) * (ball.radius);
  let d = b * b - 4 * a * c;

  if (d >= 0) {
    let t1 = (-b - Math.sqrt(d)) / (2 * a);
    let t2 = (-b + Math.sqrt(d)) / (2 * a);

    if ((t1 > 0 && t1 < l_len && t1 < max_t) || (t2 > 0 && t2 < l_len && t2 < max_t)) {
      // Calculate normal to the line
      let normal = new p5.Vector(l_dir.y, -l_dir.x).normalize();

      // Ensure the normal points outwards
      if (p5.Vector.dot(normal, toCircle) < 0) {
        normal.mult(-1);
      }

      ball.vel = reflect(ball.vel, normal);
      return true;
    }
  }
  return false;
}
function reflect(velocity, normal) {
  let dotProduct = p5.Vector.dot(velocity, normal);
  return p5.Vector.sub(velocity, p5.Vector.mult(normal, 2 * dotProduct));
}

function ballToBallCollision(ballA, ballB, cor) {
  // Compute the delta vector between the balls' positions
  let delta = p5.Vector.sub(ballA.pos, ballB.pos);
  let dist = delta.mag();

  // Check for collision
  if (dist < ballA.radius + ballB.radius) {
    let overlap = 0.5 * (dist - ballA.radius - ballB.radius);

    // Separate the balls based on overlap
    let dir = delta.copy().normalize();
    ballA.pos.add(p5.Vector.mult(dir, -overlap));
    ballB.pos.add(p5.Vector.mult(dir, overlap));

    // Calculate the velocities of balls in the direction of the collision
    let v1 = p5.Vector.dot(ballA.vel, dir);
    let v2 = p5.Vector.dot(ballB.vel, dir);

    // Ball masses
    let m1 = ballA.mass;
    let m2 = ballB.mass;

    // Compute the new velocities after the collision
    let new_v1 = (m1 * v1 + m2 * v2 - m2 * (v1 - v2) * cor) / (m1 + m2);
    let new_v2 = (m1 * v1 + m2 * v2 - m1 * (v2 - v1) * cor) / (m1 + m2);

    // Update velocities based on the collision response
    ballA.vel.add(p5.Vector.mult(dir, new_v1 - v1));
    ballB.vel.add(p5.Vector.mult(dir, new_v2 - v2));
  }
}
function handleBallCircleObstacleCollision(ball, obstacle) {
  let dir = p5.Vector.sub(ball.pos, obstacle.pos);
  let d = dir.mag();

  if (d == 0.0 || d > ball.radius + obstacle.radius)
    return;
  // Set the hit flag to true
  obstacle.hit = true;
  if (obstacle.hit) {
    hitsound.play();
  }
  dir.normalize(); // Normalize the direction vector

  // Correct the ball's position to prevent overlap
  let corr = ball.radius + obstacle.radius - d;
  ball.pos.add(p5.Vector.mult(dir, corr));

  // Reflect the ball's velocity
  let reflection = ball.vel.copy();
  reflection.sub(dir.mult(2 * p5.Vector.dot(ball.vel, dir)));
  ball.vel = reflection;

  // You can remove this line if it's not relevant to your implementation
  score++;
}

function handlePlungerCollision(ball) {
  //Plunger is on the right side of the screen, and its top is represented by plungerY
  let plungerTop = plungerY - plungerCompression;

  if (ball.pos.y + ball.radius >= plungerTop && ball.pos.x >= width - plungerWidth) {
    // Move the ball to the top of the plunger and ensure it's above the plunger considering its radius
    ball.pos.y = plungerTop - ball.radius;
  }
}




function handleBallBorderCollision(ball) {
  // Right wall
  if (ball.pos.x + ball.radius > width) {
    ball.pos.x = width - ball.radius;
    ball.vel.x = -Math.abs(ball.vel.x);
  }

  // Left wall
  if (ball.pos.x - ball.radius < 0) {
    ball.pos.x = ball.radius;
    ball.vel.x = Math.abs(ball.vel.x);
  }

  // Bottom wall
  if (ball.pos.y + ball.radius > height) {
    ball.pos.y = height - ball.radius;
    ball.vel.y = -Math.abs(ball.vel.y);
  }

  // Top wall
  if (ball.pos.y - ball.radius < 0) {
    ball.pos.y = ball.radius;
    ball.vel.y = Math.abs(ball.vel.y);
  }

  // bottom under stuff 
  if (ball.pos.y > 700 && ball.pos.x < width - plungerWidth + 10) {
    // Move the ball to the edge of the wall
    if (ball.pos.x >= width - plungerWidth) {
      ball.pos.x = width - plungerWidth;
      ball.vel.x = -ball.vel.x;
    }
  }
}



function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    flippers[0].moving = 1; // Adjusted the index to 1 for the second flipper
  } else if (keyCode === RIGHT_ARROW) {
    flippers[1].moving = 2; // Adjusted the index to 0 for the first flipper
  }
  if (keyCode === DOWN_ARROW) { // Added this to handle the plunger
    if (plungerCompression < plungerHeight) {
      plungerCompression -= 50;
    }
  }
}

function keyReleased() {
  if (keyCode === DOWN_ARROW) {
    flipperCharged = false;
    releaseBallFromPlunger();
    plungerCompression = 0; // Reset the plunger compression
  }
  if (keyCode === LEFT_ARROW) {
    flippers[0].moving = -1; // left flipper 
  } else if (keyCode === RIGHT_ARROW) {
    flippers[1].moving = -1; // right flipper
  }
}

function releaseBallFromPlunger() {
  let ballOnPlunger = getBallOnPlunger();
  print(ballOnPlunger)
  if (ballOnPlunger) {
    let forceMagnitude = 1500;  // Convert compression to a force magnitude, adjust values as needed
    let forceDirection = createVector(0, -1); // Left direction
    let force = forceDirection.mult(forceMagnitude);

    ballOnPlunger.vel.add(force);
  }

  plungerCompression = 0; // Reset plunger compression
}

function getBallOnPlunger() {
  for (let ball of balls) {
    if (ball.pos.x >= width - plungerWidth && ball.pos.y + ball.radius >= plungerY - plungerCompression) {
      return ball;
    }
  }
  return null;
}
function handleBallFlipperCollision(ball, flipper) {
  let flipperTip = flipper.getTip();

  // Find the closest point on the segment from flipper.pos to flipperTip
  let closest = closestPointOnSegment(ball.pos, flipper.pos, flipperTip);
  // Calculate the direction vector from the closest point to the ball's position
  let dir = ball.pos.copy().sub(closest);

  let d = dir.mag();

  if (d == 0.0 || d > ball.radius + flipper.radius) return;

  dir.normalize(); // Normalize the direction vector

  // Correct the ball's position
  let corr = (ball.radius + flipper.radius - d);
  // ball.pos.add(p5.Vector.mult(dir,  corr));
  ball.pos.add(p5.Vector.mult(dir, corr));
  // Update velocity
  let radius = p5.Vector.add(closest, p5.Vector.mult(dir, flipper.radius));
  radius.sub(flipper.pos);
  let surfaceVel = createVector(-radius.y, radius.x); // Perpendicular to the radius
  surfaceVel.mult(flipper.currentAngleVelocity);

  let v = p5.Vector.dot(ball.vel, dir);
  let vnew = -1 * p5.Vector.dot(surfaceVel, dir);

  ball.vel.add(p5.Vector.mult(dir, vnew - v));
}


function closestPointOnSegment(p, a, b) {
  let ab = p5.Vector.sub(b, a);
  let t = ab.magSq();

  if (t == 0.0) {
    return a.copy();
  }

  t = Math.max(0.0, Math.min(1.0, (p5.Vector.dot(p, ab) - p5.Vector.dot(a, ab)) / t));
  let closest = a.copy();
  return closest.add(p5.Vector.mult(ab, t));
}
