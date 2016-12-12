sed -i '' -e '2,4 s/^#//' ./main.py
scp ./main.py pi:/home/pi/src/magicmirror/services/faceDetection/
sed -i '' -e '2,4 s/^/#/' ./main.py
