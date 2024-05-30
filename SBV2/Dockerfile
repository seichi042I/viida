FROM python:3.10
RUN useradd -m -u 1000 user

USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/

RUN pip install --no-cache-dir --upgrade pip

RUN git clone https://github.com/litagin02/Style-Bert-VITS2

WORKDIR $HOME/Style-Bert-VITS2

RUN pip install -r requirements.txt

RUN python initialize.py

