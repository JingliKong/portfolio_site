// Tutorial: https://web.archive.org/web/20090722233436/http://blog.brandonpelfrey.com/?p=303
// more updated tutorial by Brandon Pelfrey https://github.com/genpfault/sph-tutorial 
// Sebastian Lague's video on simulating fluids: https://www.youtube.com/watch?v=rSKMYc1CQHE&t=997s 


class Particle {
    constructor(x_pos, y_pos) {
        this.x_pos = x_pos;
        this.y_pos = y_pos;
        this.previous_x_pos = x_pos;
        this.previous_y_pos = y_pos;
        this.visual_x_pos = x_pos;
        this.visual_y_pos = y_pos;
        this.rho = 0.0;
        this.rho_near = 0.0;
        this.press = 0.0;
        this.press_near = 0.0;
        this.neighbors = [];
        this.x_vel = 0.0;
        this.y_vel = 0.0;
        this.x_force = 0.0;
        this.y_force = -G;
    }

    update_state(dam) {
        // Reset previous position
        this.previous_x_pos = this.x_pos;
        this.previous_y_pos = this.y_pos;

        // Apply force and move particle
        this.x_vel += this.x_force;
        this.y_vel += this.y_force;

        this.x_pos += this.x_vel;
        this.y_pos += this.y_vel;

        // Set visual position
        this.visual_x_pos = this.x_pos;
        this.visual_y_pos = this.y_pos;

        // Reset force
        this.x_force = 0.0;
        this.y_force = -G;

        // Define velocity
        this.x_vel = this.x_pos - this.previous_x_pos;
        this.y_vel = this.y_pos - this.previous_y_pos;

        // Calculate velocity
        let velocity = Math.sqrt(this.x_vel * this.x_vel + this.y_vel * this.y_vel);

        if (velocity > MAX_VEL) {
            this.x_vel *= VEL_DAMP;
            this.y_vel *= VEL_DAMP;
        }

        // Wall constraints
        if (this.x_pos < -SIM_W) {
            this.x_force -= (this.x_pos + SIM_W) * WALL_DAMP;
            this.visual_x_pos = -SIM_W;
        }

        if (dam && this.x_pos > DAM) {
            this.x_force -= (this.x_pos - DAM) * WALL_DAMP;
        }

        if (this.x_pos > SIM_W) {
            this.x_force -= (this.x_pos - SIM_W) * WALL_DAMP;
            this.visual_x_pos = SIM_W;
        }

        if (this.y_pos < BOTTOM) {
            this.y_force -= (this.y_pos - SIM_W) * WALL_DAMP; 
            this.visual_y_pos = BOTTOM;
        }
        this.checkCollisionWithObstacle();
        this.rho = 0.0; 
        this.rho_near = 0.0;
        this.neighbors = [];
    }

    calculate_pressure() {
        this.press = K * (this.rho - REST_DENSITY);
        this.press_near = K_NEAR * this.rho_near;
    }
    checkCollisionWithObstacle() {
        let distX = cX(this.x_pos) - obstacle.x;
        let distY = (canvasHeight - this.y_pos * cScale) - obstacle.y;
        let distance = Math.sqrt(distX * distX + distY * distY);
    
        if (distance < obstacle.r + particle_radius / 2) {  // Detect collision
            // Calculate bounce direction
            let normalX = distX / distance;
            let normalY = distY / distance;
    
            // Reflect velocity
            let dot = this.x_vel * normalX + this.y_vel * normalY;
            this.x_vel -= 2 * dot * normalX;
            this.y_vel -= 2 * dot * normalY;
    
            // Adjust position outside of obstacle
            let overlap = obstacle.r + particle_radius / 2 - distance;
            this.x_pos += normalX * overlap / cScale;
            this.y_pos += normalY * overlap / cScale;
        }
    }
}

// keep track of the state of the particles
var state;
var dam_built = true;

function cX(pos) {
    return (pos + 0.5) * canvasWidth;
}

function cY(pos) {
    return canvasHeight - pos.y * cScale;
}

 
var obstacle = {
    x: canvasWidth / 2,   // center of canvas
    y: canvasHeight / 2,  // center of canvas
    r: 50  // radius
};


function setup() {

    var canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent("fluid-sim");
    // initializes all the particles 
    state = start(-SIM_W, DAM, BOTTOM, 0.03, N)
}

function draw() {
    background(220);
    if (frameCount == 250) {
        print("Breaking dam");
        dam_built = false;
    }
    obstacle.x = mouseX;
    obstacle.y = mouseY;

    state = update(state, dam_built);
    for (let i = 0; i < state.length; i++) {
        let p = state[i];
        let q = p.press; // Get the pressure of the particle

        // Calculate color based on pressure
        // let col = color(255 * (0.7 - q * cScale * 0.5), 255 * (0.8 - q * cScale * 0.4), 255 * (1.0 - q * cScale * 0.2));
        let col = color(255 * (0.5 - q*cScale * 0.5), 255 * (0.6 - q * cScale * 0.4), 255 * (0.8 - q * cScale * 0.2));

        push();
        fill(col);
        noStroke();
        circle(cX(p.visual_x_pos), Math.abs(canvasHeight - p.visual_y_pos * cScale), particle_radius);
        pop();
    }
    if (dam_built) {
        push();
        let offset = 150;
        strokeWeight(100);  
        line(cX(DAM) + offset, 0, cX(DAM) + offset, canvasHeight);
        pop();
    }
    // drawing obstacle
    fill(255, 0, 0);  // red
    circle(obstacle.x, obstacle.y, 2 * obstacle.r);

}



function start(xmin, xmax, ymin, space, count) {
    let result = [];
    let x_pos = xmin, y_pos = ymin;

    for (let i = 0; i < count; i++) {
        result.push(new Particle(x_pos, y_pos));
        x_pos += space;
        if (x_pos > xmax) {
            x_pos = xmin;
            y_pos += space;
        }
    }

    return result;
}

function calculateDensity(particles) {
    for (let i = 0; i < particles.length; i++) {
        let particle_1 = particles[i];
        let density = 0.0;
        let density_near = 0.0;

        for (let j = i + 1; j < particles.length; j++) {
            let particle_2 = particles[j];
            let dx = particle_1.x_pos - particle_2.x_pos;
            let dy = particle_1.y_pos - particle_2.y_pos;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < R) {
                let normal_distance = 1 - distance / R;
                density += Math.pow(normal_distance, 2);
                density_near += Math.pow(normal_distance, 3);
                particle_2.rho += Math.pow(normal_distance, 2);
                particle_2.rho_near += Math.pow(normal_distance, 3);
                particle_1.neighbors.push(particle_2);
            }
        }

        particle_1.rho += density;
        particle_1.rho_near += density_near;
    }
}
function createPressure(particles) {
    for (let i = 0; i < particles.length; i++) {
        let particle = particles[i];
        let press_x = 0.0;
        let press_y = 0.0;

        for (let j = 0; j < particle.neighbors.length; j++) {
            let neighbor = particle.neighbors[j];

            let particle_to_neighbor = [
                neighbor.x_pos - particle.x_pos,
                neighbor.y_pos - particle.y_pos
            ];

            let distance = Math.sqrt(
                Math.pow(particle_to_neighbor[0], 2) +
                Math.pow(particle_to_neighbor[1], 2)
            );

            let normal_distance = 1 - distance / R;

            let total_pressure =
                (particle.press + neighbor.press) * Math.pow(normal_distance, 2) +
                (particle.press_near + neighbor.press_near) * Math.pow(normal_distance, 3);

            let pressure_vector = [
                particle_to_neighbor[0] * total_pressure / distance,
                particle_to_neighbor[1] * total_pressure / distance
            ];

            neighbor.x_force += pressure_vector[0];
            neighbor.y_force += pressure_vector[1];

            press_x += pressure_vector[0];
            press_y += pressure_vector[1];
        }

        particle.x_force -= press_x;
        particle.y_force -= press_y;
    }
}

function calculateViscosity(particles) {
    for (let i = 0; i < particles.length; i++) {
        let particle = particles[i];

        for (let j = 0; j < particle.neighbors.length; j++) {
            let neighbor = particle.neighbors[j];

            let particle_to_neighbor = [
                neighbor.x_pos - particle.x_pos,
                neighbor.y_pos - particle.y_pos
            ];

            let distance = Math.sqrt(
                Math.pow(particle_to_neighbor[0], 2) +
                Math.pow(particle_to_neighbor[1], 2)
            );

            let normal_p_to_n = [
                particle_to_neighbor[0] / distance,
                particle_to_neighbor[1] / distance
            ];

            let relative_distance = distance / R;

            let velocity_difference =
                (particle.x_vel - neighbor.x_vel) * normal_p_to_n[0] +
                (particle.y_vel - neighbor.y_vel) * normal_p_to_n[1];

            if (velocity_difference > 0) {
                let viscosity_force = [
                    (1 - relative_distance) * SIGMA * velocity_difference * normal_p_to_n[0],
                    (1 - relative_distance) * SIGMA * velocity_difference * normal_p_to_n[1]
                ];

                particle.x_vel -= viscosity_force[0] * 0.5;
                particle.y_vel -= viscosity_force[1] * 0.5;
                neighbor.x_vel += viscosity_force[0] * 0.5;
                neighbor.y_vel += viscosity_force[1] * 0.5;
            }
        }
    }
}
function update(particles, dam) {
    // Update the state of the particles (apply forces, reset values, etc.)
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.checkCollisionWithObstacle();
        p.update_state(dam);
    }

    // Calculate density
    calculateDensity(particles);

    // Calculate pressure
    for (let i = 0; i < particles.length; i++) {
        particles[i].calculate_pressure();
    }

    // Apply pressure force
    createPressure(particles);

    // Apply viscosity force
    calculateViscosity(particles);

    return particles;
}

// Simulation parameters
const N = 300;  // Number of particles 250
const SIM_W = 0.5;  // Simulation space width
const BOTTOM = 0;  // Simulation space ground
const DAM = -0.3;  // Position of the dam, simulation space is between -0.5 and 0.5
const DAM_BREAK = 150;  // Number of frames before the dam breaks

// Physics parameters
const G = 0.02 * 0.25;  // Acceleration of gravity
const SPACING = 0.08;  // Spacing between particles, used to calculate pressure
const K = SPACING / 1000.0;  // Pressure factor
const K_NEAR = K * 10;  // Near pressure factor, pressure when particles are close to each other
const REST_DENSITY = 3.0;  // Default density, will be compared to local density to calculate pressure
const R = SPACING * 1.25;  // Neighbour radius, if the distance between two particles is less than R, they are neighbours
const SIGMA = 0.2;  // Viscosity factor
const MAX_VEL = 2.0;  // Maximum velocity of particles, used to avoid instability
const WALL_DAMP = 0.05;  // Wall constraints factor, how much the particle is pushed away from the simulation walls
const VEL_DAMP = 0.5;  // Velocity reduction factor when particles are going above MAX_VEL

var canvasWidth = 600;
var canvasHeight = 600;
cScale = 1200; // 0 - 0.5 
var particle_radius = 20;