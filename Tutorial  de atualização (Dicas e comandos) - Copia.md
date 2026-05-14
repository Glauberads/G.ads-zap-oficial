MÉTODO PARA ATUALIZAÇÃO MULTIZAP OFICIAL

ATENÇÃO FAZER BACKUP ANTES DE QUALQUER ALTERAÇÃO

Extraia o arquivo Multizap.zip e utiliza as pastas backend, frontend, api_oficial e api de transcrição para o tutorial.

--------------------------------------------------------------------------------------
NO SEU SISTEMA (PELO TERMINAL SSH) EX: BITVISE

REMOVER AS PASTAS DO BACKEND( MENOS A PUBLIC E .ENV)

cd /home/deploy/empresa01/backend
rm -rf /home/deploy/empresa01/backend/{dist,node_modules,src}

APÓS EXCLUIR AS PASTAS INDICADAS, ARRASTE AS PASTAS DO NOVO SISTEMA(MENOS A PUBLIC)


OBSERVAÇÃO: Os campos do Redis no .env deve ter esse modelo: 

REDIS_URI=redis://:suasenhadobanco@127.0.0.1:6379
REDIS_URI_ACK=redis://:suasenhadobanco@127.0.0.1:6379
REDIS_URI_MSG_CONN=redis://:suasenhadobanco@127.0.0.1:6379
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

APÓS FEITO O UPLOAD DAS PASTAS DÊ OS COMANDOS:

npm i && npm run build

npm run db:migrate
---------------------------------------------------------------------------------------

AGORA DELETAR AS PASTAS DA API OFICIAL( MENOS A PUBLIC E .ENV)

cd /home/deploy/empresa01/api_oficial
rm -rf /home/deploy/empresa01/api_oficial/{dist,install,node_modules,src,prisma,test}

APÓS EXCLUIR AS PASTAS INDICADAS, ARRASTE AS PASTAS DO NOVO SISTEMA(MENOS A PUBLIC)


APÓS FEITO O UPLOAD DAS PASTAS DÊ OS COMANDOS:

npm i && npm run build


--------------------------------------------------------------------------------

AGORA DELETAR AS PASTAS DO FRONTEND( MENOS A PUBLIC E .ENV)

cd /home/deploy/empresa01/frontend
rm -rf /home/deploy/empresa01/frontend/{build,node_modules,src}
--------------------------------------------------------------------------------

APÓS EXCLUIR AS PASTAS INDICADAS, ARRASTE AS PASTAS DO NOVO SISTEMA(MENOS A PUBLIC)

APÓS FEITO O UPLOAD DAS PASTAS DÊ OS COMANDOS:

npm i --f && npm run build


--------------------------------------------------------------------------------

AGORA DELETAR AS PASTAS DA API TRANSCRIÇÃO

cd /home/deploy/empresa01/api_transcricao
rm -rf /home/deploy/empresa01/api_transcricao/{.venv,__pycache__}

APÓS EXCLUIR AS PASTAS INDICADAS DÊ OS COMANDOS ABAIXO (edite o nome da sua empresa abaixo)

--------------------------------------------------------------------------------

empresa="empresa01"; transcricao_dir="/home/deploy/${empresa}/api_transcricao"; venv_dir="${transcricao_dir}/.venv"; sudo -u deploy bash -lc "export HOME=/home/deploy; cd '${transcricao_dir}'; rm -rf '${venv_dir}'; python3 -m venv '${venv_dir}'; source '${venv_dir}/bin/activate'; python -m pip install --upgrade pip setuptools wheel; if [ -f requirements.txt ]; then pip install -r requirements.txt; elif [ -f requirement.txt ]; then pip install -r requirement.txt; elif [ -f requirements-prod.txt ]; then pip install -r requirements-prod.txt; fi; pip install waitress python-dotenv"; sudo -u deploy bash -lc "export HOME=/home/deploy; export PATH=/usr/local/bin:/usr/bin:\$PATH; export PM2_HOME=/home/deploy/.pm2; pm2 restart ${empresa}-transcricao --update-env; pm2 save"; curl -i http://127.0.0.1:4002/


------------------------------------------------------------------------------


TERMINANDO, ABRA SEU SISTEMA E DÊ UM CONTROL SHIFT R

Pronto....

--------------------------------------------------------------


