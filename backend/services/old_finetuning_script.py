import json
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, Seq2SeqTrainingArguments, Seq2SeqTrainer, DataCollatorForSeq2Seq
from torch.utils.data import DataLoader, random_split
from torch.utils.data import Dataset
   
class ScheduleDataset(Dataset):
    def __init__(self, data, tokenizer, max_length):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        
        # Convert the input dictionary to a string
        input_str = json.dumps(item['input'])
        
        # Prepare the input text
        input_text = f"Generate a schedule for {item['input']['name']} based on the following information: {input_str}"
        
        input_encoding = self.tokenizer(
            input_text,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        target_encoding = self.tokenizer(
            item['output'],
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )

        return {
            'input_ids': input_encoding.input_ids.flatten(),
            'attention_mask': input_encoding.attention_mask.flatten(),
            'labels': target_encoding.input_ids.flatten()
        }

# Load model and tokenizer
model_name = "google/flan-t5-base"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Load dataset
with open('data_set1.json', 'r') as f:
    dataset = json.load(f)

# Create dataset
schedule_dataset = ScheduleDataset(dataset, tokenizer, max_length=512)

# Split dataset
train_size = int(0.9 * len(schedule_dataset))
train_dataset, val_dataset = random_split(schedule_dataset, [train_size, len(schedule_dataset) - train_size])

# Set up training arguments
training_args = Seq2SeqTrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    per_device_eval_batch_size=2,
    gradient_accumulation_steps=4,  # reduce memory by accumulating gradients over 4 steps
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir='./logs',
    logging_steps=10,
    evaluation_strategy="steps",
    eval_steps=500,
    save_steps=1000,
    load_best_model_at_end=True,
)

# Create Trainer
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    data_collator=DataCollatorForSeq2Seq(tokenizer, model=model),
)

# Fine-tune the model
trainer.train()

# Save the fine-tuned model
model.save_pretrained("./finetuned_flan_t5_large_v1")
tokenizer.save_pretrained("./finetuned_flan_t5_large_v1")