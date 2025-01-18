let arms = [];
let legs = [];

let body;
let bodyRadius = 60; // Define the radius of the circular body
let armCount = 2; 
left_arm_length = 50;
right_arm_length = 50;

var xRight = 0;
var yRight = 0;
var xLeft = 0; 
var yLeft = 0;

// leg stuff 
var THIGH_LENGTH = 100;
var CALF_LENGTH = 100;
var HIP_JOINT_MIN = 0;
var HIP_JOINT_MAX = 0
var KNEE_JOINT_MIN = 0;
var KNEE_JOINT_MAX = 0;

var hipOffsetX = 0;
var leftHip;
var rightHip;

let bodySprite;
let bananaSprite; 
let backgroundSprite ;
let armSprite;

function preload() {
  bodySprite = loadImage('assets\\inverse_kinematics\\orange.jpeg');
  bananaSprite = loadImage('assets\\inverse_kinematics\\banana.png');
  backgroundSprite = loadImage('assets\\inverse_kinematics\\jg.png');
  armSprite = loadImage('assets\\inverse_kinematics\\arm.png');
}



function setup() {
  var canvas = createCanvas(800, 800);
  canvas.parent("inverse-kinematics");
  body = createVector(width / 2, height / 2 + 100);

  // First arm on the right side
  xRight = body.x + cos(0) * bodyRadius; // 0 radians, pointing to the right
  yRight = body.y + sin(0) * bodyRadius; // sin(0) is 0, so y is the vertical center

  // arms with angle constraints
  arms.push(new IKArm(createVector(xRight, yRight), [
    [right_arm_length, -PI / 4, PI / 4], 
    [right_arm_length, -PI / 4, PI / 4], 
    [right_arm_length, -PI / 4, PI / 4], 
  ]));

  // Second arm on the opposite side
  xLeft = body.x + cos(PI) * bodyRadius;
  yLeft = body.y + sin(PI) * bodyRadius;
  arms.push(new IKArm(createVector(xLeft, yLeft), [
    [left_arm_length, -3 * PI / 4, -PI / 3],
    [left_arm_length, -PI / 4, PI / 4],
    [left_arm_length, -PI / 4, PI / 4]
  ]));

  // leg constraints 
  HIP_JOINT_MIN = -PI / 3;
  HIP_JOINT_MAX = PI / 3;
  KNEE_JOINT_MAX = PI / 2;
  // leg information 
  // Position the base points for the legs relative to the body position
  hipOffsetX = bodyRadius - 10; // Horizontal offset for the hips from the body center
  leftHip = createVector(body.x - hipOffsetX, body.y + 30);
  rightHip = createVector(body.x + hipOffsetX, body.y + 30);

  // Create left leg with IK
  legs.push(new IKArm(leftHip, [
    [THIGH_LENGTH, HIP_JOINT_MIN, HIP_JOINT_MAX],
    [CALF_LENGTH, KNEE_JOINT_MIN, KNEE_JOINT_MAX], 
  ]));

  // Create right leg with IK
  legs.push(new IKArm(rightHip, [
    [THIGH_LENGTH, -HIP_JOINT_MAX, -HIP_JOINT_MIN],
    [CALF_LENGTH, KNEE_JOINT_MIN, KNEE_JOINT_MAX], 
  ]));
}

var walkingLeft = false;
var walkingRight = false;

function draw() {
  background(41);
  imageMode(CORNER); 
  image(backgroundSprite, 0, 0, width, height); 

  
  let spriteWidth = bananaSprite.width / 9;  
  let spriteHeight = bananaSprite.height / 9;  
  imageMode(CENTER); 
  image(bananaSprite, mouseX, mouseY, spriteWidth, spriteHeight);
  let swingDirection = 0;
  // Move the body if walking
  if (walkingLeft) {
    body.x -= 2; // Move body left
    // move arms left and right 
    arms[0].basePoint.x -= 2;
    arms[1].basePoint.x -= 2;
    swingDirection = sin(frameCount * 0.05); // if we go in a different opposite direction 
  }
  else if (walkingRight) {
    body.x += 2; // Move body right
    arms[0].basePoint.x += 2;
    arms[1].basePoint.x += 2;  
    swingDirection = cos(frameCount * 0.05); // Oscillates between -1 and 1
  }
  

  // Check boundaries to prevent the body from moving off-screen
  body.x = constrain(body.x, bodyRadius, width - bodyRadius);

  // drwaing body 
  fill(100);
  noStroke();
  ellipse(body.x, body.y, bodyRadius * 2, bodyRadius * 2);
  imageMode(CENTER); // Ensure the image is centered on the body point
  image(bodySprite, body.x, body.y, bodyRadius * 2, bodyRadius * 2); // Draw the sprite

  let target = createVector(mouseX, mouseY);
  arms.forEach(arm => {
    arm.updateAndDraw(target);
  });

  // Update the hip positions relative to the moving body
  leftHip.x = body.x - hipOffsetX;
  rightHip.x = body.x + hipOffsetX;


  // Simulate a walking target for each leg by alternating the target's x position
  let leftTarget;
  let rightTarget;

  let swingOffset = 50;

  leftTarget = height - 60 - swingDirection * swingOffset;
  rightTarget = height - 60 + swingDirection * swingOffset;

  leftTarget = createVector(leftHip.x, leftTarget);
  rightTarget = createVector(rightHip.x, rightTarget);

  // Update and draw each leg
  legs.forEach((leg, i) => {
    let target = (i % 2 == 0) ? leftTarget : rightTarget; // just alternate legs that are moving  
    leg.updateAndDraw(target);
  });
}

function keyPressed() {
  if (key == 'a' || key == 'A') {
    walkingLeft = true;
  }
  if (key == 'd' || key == 'D') {
    walkingRight = true;
  }
}

function keyReleased() {
  if (key == 'a' || key == 'A') {
    walkingLeft = false;
  }
  if (key == 'd' || key == 'D') {
    walkingRight = false;
  }
}


// arm

// constraints used to restrict angles 
// length of a limb is stored at 0 index, min and max angles are at the 1st and 2nd index respectively
const LIMB_LEN = 0;
const LIMB_MIN = 1;
const LIMB_MAX = 2;
const BIAS = 3;
// needs > 60 iterations to look reasonable 
const ITERATIONS = 120;
const lerpAmount = 0.5;

class IKArm {
	constructor(basePoint, limbs) {
		this.basePoint = basePoint;
		this.limbs = limbs;
		this.limbsSize = limbs.length;
		this.joints = new Array(this.limbsSize + 1);
		this.joints[0] = this.basePoint;
		this.initJoints();
	}
	initJoints() {
		let nextJoint;
		for (let i = 0; i < this.limbsSize; i++) {
			nextJoint = createVector(0, -this.limbs[i][0]);
			this.joints[i + 1] = p5.Vector.add(this.joints[i], nextJoint);
		}
	}
	draw() {
		fill(191, 106, 52);
		noStroke();
		for (let i = 0; i < this.joints.length; i++) {
			circle(this.joints[i].x, this.joints[i].y, 20);
		}
		stroke(191, 106, 52);
		strokeWeight(10);
		for (let i = 1; i < this.joints.length; i++) {
			line(this.joints[i - 1].x, this.joints[i - 1].y, this.joints[i].x, this.joints[i].y);
		}
		// for (let i = 1; i < this.joints.length; i++) {
		// 	let start = this.joints[i - 1];
		// 	let end = this.joints[i];
		// 	let limbLength = p5.Vector.dist(start, end);
		// 	let angle = atan2(end.y - start.y, end.x - start.x);
	  
		// 	push();
		// 	translate(start.x, start.y);
		// 	rotate(angle);
	  
		// 	// Adjust these values to fit the size of your sprite and desired appearance
		// 	let spriteWidth = limbLength; // Width of the sprite segment
		// 	let spriteHeight = 50; // Height of the sprite segment
	  
		// 	// imageMode(CENTER);
		// 	imageMode(CORNERS); 
		// 	image(armSprite, 0, 0, spriteWidth, spriteHeight);
	  
		// 	pop();
		//   }
	
		

	}
	updateAndDraw(target) {
		this.updateIK(target);
		this.draw();
	}
	updateIK(target) {
		// copying joint array 
		let joints_p = this.joints.slice();
		let dist = p5.Vector.dist(this.joints[this.joints.length - 1], target);

		// running the forward and backward pass according to Fabrik algorithm
		for (let q = 0; q < ITERATIONS; q++) {
			this.backwardPass(target);
			this.forwardPass();
		}
		// if a joint is to far from the target we adjust it
		if (dist > BIAS * BIAS) {
			let direction = p5.Vector.sub(target, this.basePoint).normalize();
			target = p5.Vector.add(this.basePoint, direction.mult(dist - BIAS));
		}
		// helps smooth the animation by lerping between the previous and current joint positions
		if (lerpAmount !== 1.0) {
			for (let i = 0; i < this.joints.length; i++) {
				// recall that lerp just calculates x,y components that are proportionally the same between two vectors
				this.joints[i] = p5.Vector.lerp(joints_p[i], this.joints[i], lerpAmount);
			}
		}
	}
	backwardPass(target) {
		this.joints[this.limbsSize] = target.copy();
		for (let i = this.limbsSize; i > 0; i--) {
			let limb = this.limbs[i - 1];
			let a = this.joints[i];
			let b = this.joints[i - 1];
			let c = (i > 1) ? this.joints[i - 2] : this.basePoint;
			let diffAngleRaw = atan2(a.y - b.y, a.x - b.x) - atan2(b.y - c.y, b.x - c.x);
			let diffAngle = constrain(diffAngleRaw, limb[LIMB_MIN], limb[LIMB_MAX]);
			let angle = atan2(b.y - c.y, b.x - c.x) + diffAngle;
			this.joints[i - 1] = p5.Vector.add(a, p5.Vector.fromAngle(angle + PI).mult(limb[LIMB_LEN]));
		}
	}
	forwardPass() {
		let rootAngle = 0.0;
		this.joints[0] = this.basePoint.copy();
		for (let i = 0; i < this.limbsSize; i++) {
			let limb = this.limbs[i];
			let a = this.joints[i];
			let b = this.joints[i + 1];
			let diffAngleRaw = atan2(b.y - a.y, b.x - a.x) - rootAngle;
			diffAngleRaw = (diffAngleRaw + PI) % (2 * PI) - PI;
			let diffAngle = constrain(diffAngleRaw, limb[LIMB_MIN], limb[LIMB_MAX]);
			let angle = rootAngle + diffAngle;
			this.joints[i + 1] = p5.Vector.add(a, p5.Vector.fromAngle(angle).mult(limb[LIMB_LEN]));
			rootAngle = angle;
		}
	}
}
