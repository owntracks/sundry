#!/bin/sh

set -e

# Example code to launch m2s

M2SCONFIG=settings.py
export M2SCONFIG

python dbschema.py
./m2s.py
