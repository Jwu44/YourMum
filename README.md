# Running nginx for FE + BE
Terminal 1: nginx
Termianl 2: python3 server.py
Terminal 3: npm start

# Connecting to AWS EC2 server
ssh -i myself-mistralai.pem ec2-user@ec2-54-174-102-100.compute-1.amazonaws.com

# Install docker on EC2 server
1. sudo yum install docker
2. cat /etc/group | grep docker
3. sudo groupadd docker
4. sudo usermod -aG docker $USER
5. newgrp docker
6. sudo service docker restart

# Running the Mistral AI LLM Inference image with the following command to download the model from Hugging Face
docker run --gpus all \
-e HF_TOKEN=$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-p 8000:8000 \
ghcr.io/mistralai/mistral-src/vllm:latest \
--host 0.0.0.0 \
--model mistralai/Mistral-7B-v0.1

# If you get "Docker is unable to find image 8000:8000", might need to pull the inference image first:
docker pull ghcr.io/mistralai/mistral-src/vllm:latest