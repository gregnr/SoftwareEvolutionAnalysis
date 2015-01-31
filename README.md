# Software Evolution Analysis
This repository is a place for project data and source code for the Software Evolution Analysis project for SENG 371 at the University of Victoria. The goal of this project is to come up with an interesting question related to the evolution of software projects, then analysing real code bases to answer it.

## Question
Does the volume of unit tests in a project relate to the frequency of bugs?

## Methodolgy
Tools:

* Git
* Github (issue tracking API)
* JavaScript running under Node.js

Steps:

1. Identify code bases that have a significant history of unit tests and provide issue tracking. We will be using Github for this.
2. Develop a script that will, given a github repository and a path to the unit test folder, determine two data sets: Frequency of bugs and volume of unit tests over time. We will gather the frequency of bugs by recording the number of issues opened per unit time. We will gather the volume of unit tests by measuring the number of lines of code in all files within the test directory per unit time. The unit of time will be weekly.
3. Graph the data and observe to see if there's any relation.

## Codebases
Ideally this tool will be able to analyze any code base that implements unit testing. Some specific codebases we may be interested in are **AngularJS**, **Bootstrap**, and **Cocos2d**.

## Milestones
February 23 - Hand in project.

## Setup
Install Node.js and its package manager NPM. See [these instructions](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).

Clone the repository:
> git clone [repo url]

Navigate into the repository's directory. Run the command:
> npm install

This will download dependencies used by the program into a **node_modules** directory.

Run the program by entering:
> node src/issues.js

This project is still in development.
