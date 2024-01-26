# D-WISE Tool Suite Importer

This tool can be used to automatically import html, text, image and json files into the D-WISE Tool Suite.

The importer works by calling the API of the D-WISE Tool Suite to upload, tag and add metadata to provided documents.

## Requirements

- Python
- python-magic package

## Installation

```
pip install python-magic
```

## Usage

```
# import cnn
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/cnn_crawl_fixed --backend_url http://localhost:10220/ --project_id 1 --tag_name cnn --tag_description cnn --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date visited_date origin --metadata_types STRING DATE DATE STRING --doctype text --content_key text

python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/cnn_crawl_fixed --backend_url http://localhost:19220/ --project_id 2 --tag_name cnn --tag_description cnn --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date visited_date origin --metadata_types STRING DATE DATE STRING --doctype text --content_key text

# import spiegel new
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/spiegel_crawl_fixed --backend_url http://localhost:19220/ --project_id 2 --tag_name spiegel --tag_description spiegel --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date origin --metadata_types STRING DATE STRING --doctype text --content_key html

# import zeit new
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/zeit_crawl_fixed --backend_url http://localhost:19220/ --project_name import --project_description test --tag_name zeit --tag_description zeit --is_json --filter_duplicate_files_before_upload --metadata_keys author published_date origin --metadata_types STRING DATE STRING --doctype text --content_key raw_html

# import zeit search results
python importer/dwts_importer.py --input_dir /home/7schneid/zeit_crawl/images --backend_url http://localhost:10101/ --project_id 143 --tag_name zeit
python importer/dwts_importer.py --input_dir /home/7schneid/zeit_crawl/json --backend_url http://localhost:10101/ --project_id 143 --tag_name zeit --is_json

# import spiegel search results
python importer/dwts_importer.py --input_dir /home/7schneid/spiegel_crawl/images --backend_url http://localhost:10101/ --project_id 143 --tag_name spiegel
python importer/dwts_importer.py --input_dir /home/7schneid/spiegel_crawl/json --backend_url http://localhost:10101/ --project_id 143 --tag_name spiegel --is_json

# import global voices
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/globalvoices/images --backend_url http://localhost:13120/ --project_name global_voices --tag_name news
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/globalvoices/json --backend_url http://localhost:13120/ --project_name global_voices --tag_name news --is_json

# import wikinews
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/wikinews/images --backend_url http://localhost:13120/ --project_name wiki_news --tag_name news
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/wikinews/json --backend_url http://localhost:13120/ --project_name wiki_news --tag_name news --is_json

# import demonews
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/demonews/images --backend_url http://localhost:18120/ --project_name demo_news --tag_name health
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/demonews/json --backend_url http://localhost:18120/ --project_name demo_news --tag_name health --is_json

# import bbc
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/bbc/images --backend_url http://localhost:18120/ --project_name demo_news --tag_name bbc
python importer/dwts_importer.py --input_dir /home/tfischer/Development/dwts/data/bbc/json --backend_url http://localhost:18120/ --project_name demo_news --tag_name bbc --is_json

# import images
python dwts_importer.py --input_dir /path/to/images --backend_url http://localhost:5500/ --project_name my_project --tag_name tag1

# import json files
python dwts_importer.py --input_dir /path/to/json --backend_url http://localhost:5500/ --project_name my_project --tag_name tag1 --is_json
```

## CLI Parameters

```
  --input_dir INPUT_DIR
                        Path to directory containing json, text, html or image files to be imported
  --backend_url BACKEND_URL
                        URL of the dwts backend api
  --project_name PROJECT_NAME
                        Name of the project to import to
  --project_description PROJECT_DESCRIPTION
                        Description of the project to create (only if new project is created)
  --tag_name TAG_NAME   Name of the tag that is automatically applied to all documents
  --tag_description TAG_DESCRIPTION
                        Description of the tag that is automatically applied to all documents
  --is_json             Set if the input_dir contains JSON files
```
