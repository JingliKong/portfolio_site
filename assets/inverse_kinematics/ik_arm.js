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
