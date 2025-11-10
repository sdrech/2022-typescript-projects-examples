
# Example of the project from 2022-2024

## Description
Cloud side for B2B product which is an online device with sim- cards, that communicates with the cloud via MQTT protocol.
Around 20 cloud microservices are corresponding via Kafka, internal APIs, Public APIs (under the single API gateway) and 4 UI apps are available for customers and partners.

## Tech Stack
- Node.js, Javascript and Typescript - Express, NestJS frameworks (backend) and Angular (frontend)
- MySQL, MongoDB (Atlas or DocumentDB), Redis
- Kafka, MQTT messages
- Jest, Chai
- AWS, Docker, Kubernetes, Terraform
- Event-driven desing, RESTful API, SOA (microservices architecture), OOA
- Swagger, OpenAPI


## Functional summary 
### Microservice-1
- making decisions of sending of any media from the device to the cloud including video files, recording files and live video - based on configuration and data usage requirements
- enforcing data profile
- managing of all device media stored on the cloud side
- providing API to access the stored media for the clients
- providing API for Recording Streaming and Live streaming