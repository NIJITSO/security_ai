// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InternshipSystem {
    struct Student {
        uint id;
        string name;
        bool stageValide;
        bool rapportValide;
        uint note;
        bool certificat;
        bool exists;
    }

    address public company;
    address public supervisor;
    uint public studentCount;

    mapping(uint => Student) public students;

    event StudentAdded(uint id, string name);
    event StageValidated(uint id);
    event RapportValidated(uint id);
    event NoteAssigned(uint id, uint note);
    event CertificateGenerated(uint id);

    modifier onlyCompany() {
        require(msg.sender == company, "Only company can perform this action");
        _;
    }

    modifier onlySupervisor() {
        require(msg.sender == supervisor, "Only supervisor can perform this action");
        _;
    }

    constructor(address _supervisor) {
        company = msg.sender;
        supervisor = _supervisor;
    }

    function addStudent(string memory _name) public onlyCompany {
        studentCount++;
        students[studentCount] = Student(studentCount, _name, false, false, 0, false, true);
        emit StudentAdded(studentCount, _name);
    }

    function validerStage(uint _id) public onlyCompany {
        require(students[_id].exists, "Student does not exist");
        students[_id].stageValide = true;
        emit StageValidated(_id);
    }

    function validerRapport(uint _id) public onlySupervisor {
        require(students[_id].exists, "Student does not exist");
        students[_id].rapportValide = true;
        emit RapportValidated(_id);
    }

    function attribuerNote(uint _id, uint _note) public onlySupervisor {
        require(students[_id].exists, "Student does not exist");
        require(_note <= 20, "Note must be between 0 and 20");
        students[_id].note = _note;
        emit NoteAssigned(_id, _note);
    }

    function genererCertificat(uint _id) public {
        require(students[_id].exists, "Student does not exist");
        require(students[_id].stageValide, "Internship not validated");
        require(students[_id].rapportValide, "Report not validated");
        require(students[_id].note > 10, "Note must be greater than 10");
        
        students[_id].certificat = true;
        emit CertificateGenerated(_id);
    }

    function getStudent(uint _id) public view returns (Student memory) {
        require(students[_id].exists, "Student does not exist");
        return students[_id];
    }
}
